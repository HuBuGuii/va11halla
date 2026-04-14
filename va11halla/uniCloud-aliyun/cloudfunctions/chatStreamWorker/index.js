const https = require("https");

const DEFAULT_CHAT_OPTIONS = {
  modelName: "deepseek-ai/DeepSeek-V3",
  temperature: 0.7,
  maxTokens: 512,
  maxMess: 15,
  topP: 0.9,
  topK: 50,
  frequencyPenalty: 0.7,
};

const SILICONFLOW_API_KEY = "sk-lbzbllxviwaybcnynwqpqucqjmkcirhggutrpbqlgaqrphti";

function getApiKey() {
  return (
    SILICONFLOW_API_KEY ||
    process.env.SILICONFLOW_API_KEY ||
    process.env.UNI_SILICONFLOW_API_KEY ||
    ""
  );
}

function parseEventBody(event) {
  if (typeof event?.body === "string") {
    return JSON.parse(event.body || "{}");
  }

  if (typeof event === "object" && event) {
    return event;
  }

  return {};
}

function normalizeContent(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  return "";
}

function buildPayload(messages, options = {}) {
  return {
    model: options.modelName || DEFAULT_CHAT_OPTIONS.modelName,
    messages,
    stream: true,
    max_tokens: Number(options.maxTokens || DEFAULT_CHAT_OPTIONS.maxTokens),
    temperature: Number(options.temperature || DEFAULT_CHAT_OPTIONS.temperature),
    top_p: Number(options.topP || DEFAULT_CHAT_OPTIONS.topP),
    top_k: Number(options.topK || DEFAULT_CHAT_OPTIONS.topK),
    frequency_penalty: Number(
      options.frequencyPenalty || DEFAULT_CHAT_OPTIONS.frequencyPenalty
    ),
    n: 1,
    response_format: {
      type: "text",
    },
  };
}

function requestStreamFromSiliconFlow(messages, options, onDelta) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return Promise.reject(
      new Error("Missing SILICONFLOW_API_KEY in cloud environment")
    );
  }

  const payload = JSON.stringify(buildPayload(messages, options));

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.siliconflow.cn",
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Accept: "text/event-stream",
        },
      },
      (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          let errorText = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            errorText += chunk;
          });
          response.on("end", () => {
            reject(
              new Error(
                `SiliconFlow stream failed with status ${response.statusCode}: ${errorText}`
              )
            );
          });
          return;
        }

        let buffer = "";

        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          buffer += chunk;

          while (buffer.includes("\n\n")) {
            const separatorIndex = buffer.indexOf("\n\n");
            const block = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);

            const lines = block
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);

            for (const line of lines) {
              if (!line.startsWith("data:")) {
                continue;
              }

              const data = line.slice(5).trim();

              if (!data) {
                continue;
              }

              if (data === "[DONE]") {
                resolve();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta =
                  parsed?.choices?.[0]?.delta?.content ||
                  parsed?.choices?.[0]?.delta?.reasoning_content ||
                  "";

                if (delta) {
                  onDelta(delta);
                }
              } catch (error) {
                reject(error);
                return;
              }
            }
          }
        });

        response.on("end", () => {
          resolve();
        });

        response.on("error", (error) => {
          reject(error);
        });
      }
    );

    request.setTimeout(120000, () => {
      request.destroy(new Error("SiliconFlow stream timed out"));
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.write(payload);
    request.end();
  });
}

async function saveAssistantMessage(db, sessionId, content) {
  await db.collection("chat").add({
    session_id: sessionId,
    role: "assistant",
    content,
    created_at: Date.now(),
  });
}

exports.main = async (event) => {
  const body = parseEventBody(event);
  const taskId = String(body.taskId || "");
  const taskToken = String(body.taskToken || "");

  if (!taskId || !taskToken) {
    return {
      code: 1,
      message: "taskId and taskToken are required",
    };
  }

  const db = uniCloud.database();
  const taskCollection = db.collection("chat_stream");
  const taskRes = await taskCollection.doc(taskId).get();
  const task = taskRes.data?.[0];

  if (!task || task.task_token !== taskToken) {
    return {
      code: 2,
      message: "stream task not found",
    };
  }

  if (task.status === "completed") {
    return {
      code: 0,
      message: "already completed",
    };
  }

  if (task.status === "streaming") {
    return {
      code: 0,
      message: "already streaming",
    };
  }

  const sessionRes = await db.collection("session").doc(task.session_id).get();
  const session = sessionRes.data?.[0];

  if (!session) {
    await taskCollection.doc(taskId).update({
      status: "failed",
      error_message: "Session not found",
      updated_at: Date.now(),
    });

    return {
      code: 3,
      message: "session not found",
    };
  }

  const options = task.options || {};
  const historyLimit = Number(options.maxMess || DEFAULT_CHAT_OPTIONS.maxMess);
  const historyRes = await db
    .collection("chat")
    .where({
      session_id: task.session_id,
    })
    .orderBy("created_at", "desc")
    .limit(historyLimit > 0 ? historyLimit : 100)
    .get();

  const historyMessages = (historyRes.data || [])
    .reverse()
    .map((item) => ({
      role: item.role,
      content: normalizeContent(item.content),
    }))
    .filter((item) => item.content);

  const modelMessages = [];

  if (session.systemText) {
    modelMessages.push({
      role: "system",
      content: session.systemText,
    });
  }

  modelMessages.push(...historyMessages);

  await taskCollection.doc(taskId).update({
    status: "streaming",
    updated_at: Date.now(),
    error_message: "",
  });

  let accumulatedText = "";
  let lastFlushAt = 0;

  try {
    await requestStreamFromSiliconFlow(modelMessages, options, async (delta) => {
      accumulatedText += delta;

      const now = Date.now();

      if (now - lastFlushAt < 200) {
        return;
      }

      lastFlushAt = now;

      await taskCollection.doc(taskId).update({
        accumulated_text: accumulatedText,
        updated_at: now,
      });
    });

    await taskCollection.doc(taskId).update({
      status: "completed",
      accumulated_text: accumulatedText,
      updated_at: Date.now(),
      error_message: "",
    });

    await saveAssistantMessage(db, task.session_id, accumulatedText);

    return {
      code: 0,
      message: "stream completed",
    };
  } catch (error) {
    await taskCollection.doc(taskId).update({
      status: "failed",
      accumulated_text: accumulatedText,
      updated_at: Date.now(),
      error_message: error.message || "stream failed",
    });

    return {
      code: 4,
      message: error.message || "stream failed",
    };
  }
};

