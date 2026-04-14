import { stripLegacyAttachmentText } from "./messageService";

export const DEFAULT_VISION_MODELS = [
  "Qwen/Qwen2.5-VL-72B-Instruct",
  "Qwen/Qwen2-VL-72B-Instruct",
  "Qwen/Qwen2.5-VL-7B-Instruct",
];
export const DEFAULT_PDF_MODEL = "deepseek-ai/DeepSeek-OCR";


export const DEFAULT_CONTEXT_LIMITS = {
  maxContextMessages: 8,
  maxUserMessages: 4,
  maxAssistantMessages: 4,
  maxMemoryBlocks: 3,
  maxEventsPerMemory: 3,
  maxTextAttachmentCharsPerFile: 3000,
  maxTextAttachmentCharsTotal: 6000,
};

function truncateText(value = "", maxChars = DEFAULT_CONTEXT_LIMITS.maxTextAttachmentCharsPerFile) {
  const text = String(value || "");
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}
...[truncated]`;
}

function buildContextSummaryBlock(summaryText = "") {
  const clean = String(summaryText || "").trim();
  if (!clean) {
    return null;
  }

  return {
    role: "system",
    content: `Conversation summary:
${clean}`,
  };
}

function buildMemoryContextBlock(memories = [], limits = DEFAULT_CONTEXT_LIMITS) {
  if (!Array.isArray(memories) || !memories.length) {
    return null;
  }

  const selectedMemories = memories.slice(0, Math.max(1, limits.maxMemoryBlocks || 3));
  const sections = [];

  for (const memory of selectedMemories) {
    const summaryText = String(memory.summary_text || "").trim();
    const events = Array.isArray(memory.events) ? memory.events.slice(0, limits.maxEventsPerMemory || 3) : [];
    const eventLines = events
      .map((item) => {
        const type = String(item.type || "fact").trim();
        const title = String(item.title || "").trim();
        const summary = String(item.summary || "").trim();
        return `- [${type}] ${title || summary}`;
      })
      .filter(Boolean);

    const blockLines = [];
    if (summaryText) {
      blockLines.push(`Summary: ${summaryText}`);
    }
    if (eventLines.length) {
      blockLines.push("Events:");
      blockLines.push(...eventLines);
    }

    if (blockLines.length) {
      sections.push(blockLines.join("\n"));
    }
  }

  if (!sections.length) {
    return null;
  }

  return {
    role: "system",
    content: `Long-term memory:\n${sections.join("\n\n")}`,
  };
}

export function selectRecentMessages(messages = [], limits = DEFAULT_CONTEXT_LIMITS) {
  const picked = [];
  let userCount = 0;
  let assistantCount = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const item = messages[index];
    if (item.role === "user") {
      if (userCount >= limits.maxUserMessages) {
        continue;
      }
      userCount += 1;
    }

    if (item.role === "assistant") {
      if (assistantCount >= limits.maxAssistantMessages) {
        continue;
      }
      assistantCount += 1;
    }

    picked.unshift(item);
    if (picked.length >= limits.maxContextMessages) {
      break;
    }
  }

  return picked;
}

export function splitContextMessages(messages = [], maxMess, limits = DEFAULT_CONTEXT_LIMITS) {
  const history = messages
    .filter((item) => item.status !== "error" && (item.role !== "assistant" || item.content))
    .map((item) => ({
      ...item,
      content: Array.isArray(item.content) ? item.content : stripLegacyAttachmentText(item.content),
    }))
    .filter((item) => {
      if (Array.isArray(item.content)) {
        return item.content.length > 0;
      }

      return Boolean(item.content);
    });

  const historyLimit = Math.max(1, Number(maxMess) || limits.maxContextMessages);
  const appliedLimits = {
    ...limits,
    maxContextMessages: historyLimit,
  };
  const recentMessages = selectRecentMessages(history, appliedLimits);
  const recentIds = new Set(recentMessages.map((item) => item.id));
  const archivedMessages = history.filter((item) => !recentIds.has(item.id));

  return {
    appliedLimits,
    history,
    recentMessages,
    archivedMessages,
  };
}

export function extractApiErrorMessage(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    return parsed?.message || parsed?.error?.message || rawText;
  } catch (error) {
    return rawText;
  }
}

export function isVisionModel(modelName = "") {
  const normalized = String(modelName).toLowerCase();
  return [
    "vl",
    "vision",
    "ocr",
    "omni",
    "internvl",
    "glm-4.1v",
    "glm-4.6v",
    "qvq",
  ].some((keyword) => normalized.includes(keyword));
}

export function isPdfCapableModel(modelName = "") {
  return String(modelName).toLowerCase().includes("deepseek-ocr");
}

export async function getAvailableModels(apiKey) {
  const result = await uni.request({
    url: "https://api.siliconflow.cn/v1/models?sub_type=chat",
    method: "GET",
    header: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return (result?.data?.data || [])
    .map((item) => ({
      text: item.id,
      value: item.id,
    }))
    .filter((item) => item.value);
}

export function resolveRequestModel(settingsModel, attachments = [], fetchedModels = []) {
  const hasMediaAttachment = attachments.some((item) => item.kind === "image" || item.kind === "pdf");
  const hasPdfAttachment = attachments.some((item) => item.kind === "pdf");
  const hasImageAttachment = attachments.some((item) => item.kind === "image");

  if (!hasMediaAttachment) {
    return settingsModel;
  }

  if (hasPdfAttachment) {
    if (isPdfCapableModel(settingsModel)) {
      return settingsModel;
    }

    const fallbackPdfModel = fetchedModels.find((item) => isPdfCapableModel(item.value));
    if (fallbackPdfModel?.value) {
      return fallbackPdfModel.value;
    }

    return DEFAULT_PDF_MODEL;
  }

  if (hasImageAttachment) {
    const preferredVisionModel = DEFAULT_VISION_MODELS.find((modelName) =>
      fetchedModels.some((item) => item.value === modelName)
    );

    if (preferredVisionModel) {
      return preferredVisionModel;
    }
  }

  if (isVisionModel(settingsModel)) {
    return settingsModel;
  }

  const fallbackVisionModel = fetchedModels.find((item) => isVisionModel(item.value));
  if (fallbackVisionModel?.value) {
    return fallbackVisionModel.value;
  }

  throw new Error("Current model may not support image input. Please choose a vision model in settings.");
}

export function messageToApiMessage(message, limits = DEFAULT_CONTEXT_LIMITS) {
  const attachments = message.extra?.attachments || [];
  const textAttachments = attachments.filter((item) => item.kind === "text");
  const mediaAttachments = attachments.filter((item) => item.kind === "image" || item.kind === "pdf");
  const textSegments = [];
  const cleanedContent = stripLegacyAttachmentText(message.content);

  if (cleanedContent) {
    textSegments.push(cleanedContent);
  }

  if (textAttachments.length) {
    const fileBlocks = textAttachments.map(
      (item) => `[File: ${item.name}]\n${truncateText(item.textContent || "(Text unavailable after reload)", limits.maxTextAttachmentCharsPerFile)}`
    );

    let totalChars = 0;
    const limitedBlocks = [];
    for (const block of fileBlocks) {
      if (totalChars >= limits.maxTextAttachmentCharsTotal) {
        break;
      }
      const remaining = limits.maxTextAttachmentCharsTotal - totalChars;
      const clipped = block.length > remaining ? `${block.slice(0, remaining)}\n...[truncated]` : block;
      limitedBlocks.push(clipped);
      totalChars += clipped.length;
    }

    textSegments.push(limitedBlocks.join("\n\n"));
  }

  if (!mediaAttachments.length) {
    return {
      role: message.role,
      content: textSegments.join("\n\n").trim(),
    };
  }

  const parts = mediaAttachments
    .filter((item) => item.dataUrl)
    .map((item) => {
      const imageBlock = {
        type: "image_url",
        image_url: {
          url: item.dataUrl,
        },
      };

      if (item.kind === "image") {
        imageBlock.image_url.detail = "high";
      }

      return imageBlock;
    });

  const finalText = textSegments.join("\n\n").trim() || "Please analyze the attached content.";
  parts.unshift({
    type: "text",
    text: finalText,
  });

  return {
    role: message.role,
    content: parts,
  };
}

export function buildRequestMessages({
  messages,
  memories = [],
  systemText,
  maxMess,
  summaryText = "",
  limits = DEFAULT_CONTEXT_LIMITS,
}) {
  const { recentMessages } = splitContextMessages(messages, maxMess, limits);
  const trimmedHistory = recentMessages.map((item) => messageToApiMessage(item, limits));
  const requestMessages = [];

  if (systemText) {
    requestMessages.push({
      role: "system",
      content: systemText,
    });
  }

  const summaryBlock = buildContextSummaryBlock(summaryText);
  if (summaryBlock) {
    requestMessages.push(summaryBlock);
  }

  const memoryBlock = buildMemoryContextBlock(memories, limits);
  if (memoryBlock) {
    requestMessages.push(memoryBlock);
  }

  requestMessages.push(...trimmedHistory);
  return requestMessages;
}

export async function streamChatCompletion({
  apiKey,
  apiUrl,
  model,
  messages,
  temperature,
  maxTokens,
  frequencyPenalty,
  onDelta,
}) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: Number(maxTokens),
      temperature: Number(temperature),
      top_p: 0.7,
      top_k: 50,
      frequency_penalty: Number(frequencyPenalty),
      n: 1,
      response_format: {
        type: "text",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(extractApiErrorMessage(errorText) || `SiliconFlow request failed: ${response.status}`);
  }

  if (!response.body || !response.body.getReader) {
    throw new Error("Streaming response is not available on this platform");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, {
      stream: true,
    });

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
          return fullText;
        }

        const parsed = JSON.parse(data);
        const delta =
          parsed?.choices?.[0]?.delta?.content ||
          parsed?.choices?.[0]?.delta?.reasoning_content ||
          "";

        if (delta) {
          fullText += delta;
          if (typeof onDelta === "function") {
            await onDelta(fullText);
          }
        }
      }
    }
  }

  return fullText;
}
