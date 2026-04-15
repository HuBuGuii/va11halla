const crypto = require("crypto");
const uniId = require("uni-id-common");

const DEFAULT_CHAT_OPTIONS = {
  modelName: "deepseek-ai/DeepSeek-V3",
  temperature: 0.7,
  maxTokens: 1024,
  maxMess: 8,
  topP: 0.7,
  topK: 50,
  frequencyPenalty: 0.5,
};

const DEFAULT_MEMORY_OPTIONS = {
  keepRecent: 6,
  maxSourceMessages: 24,
  maxEvents: 6,
};

const GENERAL_MEMORY_TAGS = [
  "life",
  "study",
  "work",
  "game",
  "movie",
  "music",
  "anime",
  "food",
  "travel",
  "pet",
  "fitness",
  "fashion",
  "technology",
  "art",
  "relationship",
  "emotion",
];

const STYLE_TAGS = [
  "gentle",
  "playful",
  "serious",
  "rational",
  "expressive",
  "introverted",
  "outgoing",
];

const SOCIAL_TAGS = [
  "wants_companionship",
  "open_to_chat",
  "prefers_gentle_tone",
  "prefers_humor",
  "shares_interests",
  "emotionally_expressive",
];

const EMOTION_SIGNAL_TYPES = [
  "joy",
  "calm",
  "curiosity",
  "stress",
  "anxiety",
  "sadness",
  "loneliness",
  "excitement",
];

const CORE_EVENT_TYPES = [
  "goal",
  "preference",
  "fact",
  "decision",
  "emotion",
  "relationship_signal",
];

const CORE_EVENT_SCHEMA_VERSION = "v1";

const SILICONFLOW_API_KEY = "sk-lbzbllxviwaybcnynwqpqucqjmkcirhggutrpbqlgaqrphti";

function normalizeContent(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  return "";
}

function getDb(ctx) {
  return uniCloud.databaseForJQL({
    clientInfo: ctx.getClientInfo(),
  });
}

function getRawDb() {
  return uniCloud.database();
}

function getDbCommand() {
  return uniCloud.database().command;
}

function getApiKey() {
  return (
    SILICONFLOW_API_KEY ||
    process.env.SILICONFLOW_API_KEY ||
    process.env.UNI_SILICONFLOW_API_KEY ||
    ""
  );
}

function normalizeSettingPayload(set = {}, userId) {
  return {
    user_id: String(userId),
    modelName: set.modelName || DEFAULT_CHAT_OPTIONS.modelName,
    temperature: Number(set.temperature ?? DEFAULT_CHAT_OPTIONS.temperature),
    maxTokens: Number(set.maxTokens ?? DEFAULT_CHAT_OPTIONS.maxTokens),
    repeat: Number(
      set.repeat ?? set.frequencyPenalty ?? DEFAULT_CHAT_OPTIONS.frequencyPenalty
    ),
    maxMess: Number(set.maxMess ?? DEFAULT_CHAT_OPTIONS.maxMess),
  };
}

function createTaskToken() {
  return crypto.randomBytes(24).toString("hex");
}

async function getCurrentUserIdFromContext(ctx) {
  const clientInfo = ctx.getClientInfo();
  const token = clientInfo.uniIdToken;
  const tokenValid = await ctx.uniId.checkToken(token);

  if (!tokenValid?.uid) {
    throw new Error("User not authenticated");
  }

  return tokenValid.uid;
}

async function saveMessageRecord(ctx, { session_id, role, content, extra = null }) {
  const dbJql = getDb(ctx);

  await dbJql.collection("chat").add({
    session_id,
    role,
    content,
    extra,
    created_at: Date.now(),
  });
}

async function getSessionDetailById(ctx, session_id) {
  const dbJql = getDb(ctx);
  const res = await dbJql.collection("session").doc(String(session_id)).get();
  const session = res.data?.[0];

  if (!session) {
    throw new Error("Session not found");
  }

  return {
    id: session._id,
    title: session.title || "Chat",
    avatar: session.avatar || "",
    systemText: session.systemText || "",
    personaId: session.persona_id || "",
    showPub: session.showPub === "public" ? "public" : "private",
  };
}

async function getRawSessionById(session_id) {
  const db = getRawDb();
  const res = await db.collection("session").doc(String(session_id)).get();
  return res.data?.[0] || null;
}

async function getRawPersonaById(persona_id) {
  const db = getRawDb();
  const res = await db.collection("persona").doc(String(persona_id)).get();
  return res.data?.[0] || null;
}

function buildSiliconFlowPayload(messages, options = {}) {
  return {
    model: options.modelName || DEFAULT_CHAT_OPTIONS.modelName,
    messages,
    stream: false,
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

function clipText(value, maxLength = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function normalizeEnumArray(values, allowedValues, maxLength = allowedValues.length) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((item) => String(item || "").trim())
        .filter((item) => allowedValues.includes(item))
    )
  ).slice(0, maxLength);
}

function clampScore(value, fallback = 0.5) {
  const score = Number(value);
  if (Number.isNaN(score)) {
    return fallback;
  }

  if (score < 0) {
    return 0;
  }

  if (score > 1) {
    return 1;
  }

  return score;
}

function extractJsonBlock(value = "") {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw;
}

function normalizeCoreEvent(event = {}) {
  return {
    type: CORE_EVENT_TYPES.includes(event.type) ? event.type : "fact",
    title: clipText(event.title || event.summary || "", 60),
    summary: clipText(event.summary || event.title || "", 220),
    keywords: Array.isArray(event.keywords)
      ? event.keywords.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
      : [],
    participants: Array.isArray(event.participants) && event.participants.length
      ? event.participants.map((item) => String(item).trim()).filter(Boolean).slice(0, 4)
      : ["user", "assistant"],
    importance: clampScore(event.importance, 0.7),
    confidence: clampScore(event.confidence, 0.6),
    sourceMessageIds: Array.isArray(event.sourceMessageIds)
      ? event.sourceMessageIds.map((item) => String(item)).filter(Boolean)
      : [],
    timeStart: Number(event.timeStart || 0),
    timeEnd: Number(event.timeEnd || 0),
  };
}

function createCompressionMessages(session, messages) {
  const payload = {
    sessionId: String(session._id || ""),
    sessionType: session.showPub === "public" ? "public" : "private",
    systemText: String(session.systemText || ""),
    messages: messages.map((item) => ({
      id: String(item._id || ""),
      role: String(item.role || "user"),
      content: normalizeContent(item.content),
      created_at: Number(item.created_at || 0),
      extra: item.extra || null,
    })),
  };

  const systemPrompt = [
    "You are a core event extractor for a chat memory system.",
    "Convert raw chat messages into durable memory JSON.",
    "Return valid JSON only.",
    `Allowed event types: ${CORE_EVENT_TYPES.join(", ")}.`,
    `Allowed interest_tags: ${GENERAL_MEMORY_TAGS.join(", ")}.`,
    `Allowed style_tags: ${STYLE_TAGS.join(", ")}.`,
    `Allowed social_tags: ${SOCIAL_TAGS.join(", ")}.`,
    `Allowed emotion_signals.name: ${EMOTION_SIGNAL_TYPES.join(", ")}.`,
    "Do not segment by role. Segment by semantic closure.",
    "Drop greetings, filler, and repeated confirmations.",
    "Use broad, stable tags. Prefer fewer strong events over many weak ones.",
    "Output keys: summary_text, events, source_message_ids, interest_tags, style_tags, social_tags, persona_signals, emotion_signals, tags.",
  ].join("\n");

  const userPrompt = [
    "Extract compressed long-term memory from the following chat history.",
    "Preserve durable goals, preferences, facts, decisions, emotions, and relationship signals.",
    "All sourceMessageIds must come from input ids.",
    "Input JSON:",
    JSON.stringify(payload),
  ].join("\n\n");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

function buildHeuristicMemory(session, messages, options = {}) {
  const now = Date.now();
  const maxEvents = Number(options.maxEvents || DEFAULT_MEMORY_OPTIONS.maxEvents);
  const clippedMessages = messages.slice(-Math.max(1, maxEvents));
  const summaryLines = [];
  const events = [];

  for (const item of clippedMessages) {
    const clean = clipText(item.content, 140);
    if (!clean) {
      continue;
    }

    summaryLines.push(`${item.role === "assistant" ? "Assistant" : "User"}: ${clean}`);
    events.push({
      type: "fact",
      title: clipText(clean, 36),
      summary: clean,
      keywords: [],
      participants: ["user", "assistant"],
      importance: 0.7,
      confidence: 0.6,
      sourceMessageIds: [String(item._id)],
      timeStart: Number(item.created_at || 0),
      timeEnd: Number(item.created_at || 0),
    });
  }

  return {
    session_id: String(session._id || session.id || ""),
    user_id: String(session.user_id || ""),
    session_type: session.showPub === "public" ? "public" : "private",
    memory_kind: "compressed_events",
    event_schema_version: CORE_EVENT_SCHEMA_VERSION,
    summary_text: summaryLines.join("\n"),
    events,
    source_message_ids: messages.map((item) => String(item._id)).filter(Boolean),
    source_message_count: messages.length,
    time_range_start: Number(messages[0]?.created_at || now),
    time_range_end: Number(messages[messages.length - 1]?.created_at || now),
    tags: [],
    interest_tags: [],
    style_tags: [],
    social_tags: [],
    persona_signals: [],
    emotion_signals: [],
    status: "active",
    created_at: now,
    updated_at: now,
  };
}

async function extractStructuredMemory(session, messages, options = {}) {
  const rawReply = await requestSiliconFlowCompletion(createCompressionMessages(session, messages), {
    modelName: options.modelName || DEFAULT_CHAT_OPTIONS.modelName,
    temperature: 0.2,
    maxTokens: 2048,
    topP: 0.7,
    topK: 40,
    frequencyPenalty: 0.2,
  });
  const parsed = JSON.parse(extractJsonBlock(rawReply));
  const now = Date.now();
  const sourceIds = messages.map((item) => String(item._id)).filter(Boolean);
  const validSourceIds = new Set(sourceIds);
  const events = Array.isArray(parsed.events)
    ? parsed.events
        .map(normalizeCoreEvent)
        .map((item) => ({
          ...item,
          sourceMessageIds: item.sourceMessageIds.filter((id) => validSourceIds.has(id)),
        }))
        .filter((item) => item.title || item.summary)
        .slice(0, Number(options.maxEvents || DEFAULT_MEMORY_OPTIONS.maxEvents))
    : [];

  return {
    session_id: String(session._id || session.id || ""),
    user_id: String(session.user_id || ""),
    session_type: session.showPub === "public" ? "public" : "private",
    memory_kind: "compressed_events",
    event_schema_version: CORE_EVENT_SCHEMA_VERSION,
    summary_text: clipText(parsed.summary_text || "", 1200),
    events,
    source_message_ids: sourceIds,
    source_message_count: sourceIds.length,
    time_range_start: Number(messages[0]?.created_at || now),
    time_range_end: Number(messages[messages.length - 1]?.created_at || now),
    tags: normalizeEnumArray(parsed.tags, GENERAL_MEMORY_TAGS, 5),
    interest_tags: normalizeEnumArray(parsed.interest_tags, GENERAL_MEMORY_TAGS, 5),
    style_tags: normalizeEnumArray(parsed.style_tags, STYLE_TAGS, 3),
    social_tags: normalizeEnumArray(parsed.social_tags, SOCIAL_TAGS, 3),
    persona_signals: Array.isArray(parsed.persona_signals)
      ? parsed.persona_signals.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
      : [],
    emotion_signals: Array.isArray(parsed.emotion_signals)
      ? parsed.emotion_signals
          .map((item) => ({
            name: EMOTION_SIGNAL_TYPES.includes(item?.name) ? item.name : null,
            score: clampScore(item?.score, 0.5),
            polarity: ["positive", "neutral", "negative"].includes(item?.polarity)
              ? item.polarity
              : "neutral",
          }))
          .filter((item) => item.name)
          .slice(0, 3)
      : [],
    status: "active",
    created_at: now,
    updated_at: now,
  };
}

async function buildMemoryFromMessages(session, messages, options = {}) {
  try {
    const extracted = await extractStructuredMemory(session, messages, options);
    if (extracted.summary_text || extracted.events.length) {
      return extracted;
    }
  } catch (error) {
    console.warn("[session memory] structured extraction failed", error);
  }

  return buildHeuristicMemory(session, messages, options);
}

async function requestSiliconFlowCompletion(messages, options = {}) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("Missing SILICONFLOW_API_KEY in cloud environment");
  }

  const payload = buildSiliconFlowPayload(messages, options);

  const response = await uniCloud.httpclient.request(
    "https://api.siliconflow.cn/v1/chat/completions",
    {
      method: "POST",
      contentType: "json",
      dataType: "json",
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      data: payload,
    }
  );

  if (response.status !== 200) {
    throw new Error(`SiliconFlow request failed with status ${response.status}`);
  }

  return response.data?.choices?.[0]?.message?.content || "";
}

async function getTaskRecord(ctx, taskId) {
  const dbJql = getDb(ctx);
  const res = await dbJql.collection("chat_stream").doc(String(taskId)).get();
  return res.data?.[0] || null;
}

module.exports = {
  _before() {
    const clientInfo = this.getClientInfo();
    this.uniId = uniId.createInstance({
      clientInfo,
    });
  },

  async getCurrentUserId() {
    return getCurrentUserIdFromContext(this);
  },

  async saveMessage({ session_id, role, content, extra = null }) {
    await saveMessageRecord(this, { session_id, role, content, extra });
    return {
      code: 0,
      msg: "ok",
      session_id,
      role,
    };
  },

  async getSessions(uid) {
    const dbJql = getDb(this);
    const sessions = await dbJql
      .collection("session")
      .where({ user_id: uid })
      .get();

    return sessions.data
      .map((item) => ({
        id: item._id,
        title: item.title,
        avatar: item.avatar,
        showPub: item.showPub === "public" ? "Public" : "Private",
      }))
      .reverse();
  },

  async getPrompt(session_id) {
    const dbJql = getDb(this);
    const res = await dbJql.collection("session").doc(String(session_id)).get();

    return res.data?.[0]?.systemText || "";
  },

  async getSessionDetail(session_id) {
    return getSessionDetailById(this, session_id);
  },

  async getMessages({ session_id, limit = 20 }) {
    const dbJql = getDb(this);
    const res = await dbJql
      .collection("chat")
      .where({ session_id })
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();

    return {
      code: 0,
      messages: res.data.reverse(),
    };
  },

  async getSessionMemories({ session_id, limit = 10 }) {
    if (!session_id) {
      throw new Error("session_id is required");
    }

    const dbJql = getDb(this);
    const res = await dbJql
      .collection("session_memory")
      .where({ session_id: String(session_id), status: "active" })
      .orderBy("created_at", "desc")
      .limit(Number(limit) || 10)
      .get();

    return {
      code: 0,
      memories: res.data || [],
    };
  },

  async getPersonas({ includePrivate = false } = {}) {
    const dbJql = getDb(this);
    const user_id = await getCurrentUserIdFromContext(this);
    const where = includePrivate
      ? {
          $or: [{ showPub: "public" }, { user_id }],
        }
      : {
          showPub: "public",
        };

    const res = await dbJql
      .collection("persona")
      .where(where)
      .orderBy("updated_at", "desc")
      .get();

    return {
      code: 0,
      personas: (res.data || []).map((item) => ({
        id: item._id,
        title: item.title || "Persona",
        avatar: item.avatar || "",
        description: item.description || "",
        systemText: item.systemText || "",
        showPub: item.showPub === "public" ? "public" : "private",
        tags: Array.isArray(item.tags) ? item.tags : [],
        belong: item.belong || "",
      })),
    };
  },

  async createPersona({
    title = "",
    description = "",
    systemText = "",
    showPub = "private",
    avatar = "",
    tags = [],
  } = {}) {
    const db = getRawDb();
    const user_id = await getCurrentUserIdFromContext(this);
    const userRes = await db.collection("uni-id-users").doc(user_id).get();
    const nickname = userRes.data?.[0]?.nickname || "";
    const now = Date.now();

    const created = await db.collection("persona").add({
      user_id,
      belong: nickname,
      title: title || "Persona",
      description: description || "",
      systemText: systemText || "",
      showPub: showPub === "public" ? "public" : "private",
      avatar:
        avatar ||
        "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/avatars/jill.png",
      tags: Array.isArray(tags)
        ? tags.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [],
      created_at: now,
      updated_at: now,
    });

    return {
      code: 0,
      id: created.id,
    };
  },

  async createSession(title, systemText, showPub, avatar) {
    try {
      const db = getRawDb();
      const user_id = await getCurrentUserIdFromContext(this);
      const userRes = await db.collection("uni-id-users").doc(user_id).get();
      const nickname = userRes.data?.[0]?.nickname || "";

      const created = await db.collection("session").add({
        user_id,
        belong: nickname,
        systemText: systemText || "",
        persona_id: "",
        showPub,
        avatar:
        avatar ||
        "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/avatars/jill.png",
        title: title || "Jill",
        created_at: Date.now(),
      });

      return {
        code: 0,
        id: created.id,
      };
    } catch (error) {
      throw new Error(`[createSession] ${error?.message || error}`);
    }
  },

  async copySession(inid) {
    try {
      const id = String(inid);
      const db = getRawDb();
      const user_id = await getCurrentUserIdFromContext(this);
      const userRes = await db.collection("uni-id-users").doc(user_id).get();
      const nickname = userRes.data?.[0]?.nickname || "";
      const session1 = await db.collection("session").doc(id).get();
      const session = session1.data?.[0];

      if (!session) {
        throw new Error(`template session not found: ${id}`);
      }

      const copyRes = await db.collection("session").add({
        user_id,
        belong: nickname,
        systemText: session.systemText || "",
        persona_id: "",
        showPub: "private",
        avatar: session.avatar || "",
        title: session.title || "Chat",
        created_at: Date.now(),
      });

      return copyRes.id;
    } catch (error) {
      throw new Error(`[copySession] ${error?.message || error}`);
    }
  },

  async clonePersonaToSession(persona_id, sessionVisibility = "private") {
    try {
      const db = getRawDb();
      const user_id = await getCurrentUserIdFromContext(this);
      const userRes = await db.collection("uni-id-users").doc(user_id).get();
      const nickname = userRes.data?.[0]?.nickname || "";
      const persona = await getRawPersonaById(persona_id);

      if (!persona) {
        throw new Error(`persona not found: ${persona_id}`);
      }

      const created = await db.collection("session").add({
        user_id,
        belong: nickname,
        title: persona.title || "Chat",
        avatar: persona.avatar || "",
        systemText: persona.systemText || "",
        persona_id: String(persona._id),
        showPub: sessionVisibility === "public" ? "public" : "private",
        created_at: Date.now(),
      });

      return {
        code: 0,
        id: created.id,
      };
    } catch (error) {
      throw new Error(`[clonePersonaToSession] ${error?.message || error}`);
    }
  },

  async compressSessionHistory({ session_id, options = {} }) {
    if (!session_id) {
      throw new Error("session_id is required");
    }

    const db = getRawDb();
    const dbCmd = getDbCommand();
    const session = await getRawSessionById(session_id);

    if (!session) {
      throw new Error("Session not found");
    }

    const keepRecent = Math.max(1, Number(options.keepRecent || DEFAULT_MEMORY_OPTIONS.keepRecent));
    const maxSourceMessages = Math.max(
      keepRecent + 1,
      Number(options.maxSourceMessages || DEFAULT_MEMORY_OPTIONS.maxSourceMessages)
    );
    const chatRes = await db
      .collection("chat")
      .where({
        session_id: String(session_id),
      })
      .orderBy("created_at", "asc")
      .limit(maxSourceMessages)
      .get();

    const allMessages = chatRes.data || [];
    if (allMessages.length <= keepRecent) {
      return {
        code: 0,
        compressed: false,
        reason: "not_enough_messages",
      };
    }

    const messagesToCompress = allMessages.slice(0, allMessages.length - keepRecent);
    if (!messagesToCompress.length) {
      return {
        code: 0,
        compressed: false,
        reason: "empty_compression_window",
      };
    }

    const memoryPayload = await buildMemoryFromMessages(session, messagesToCompress, options);
    const memoryRes = await db.collection("session_memory").add(memoryPayload);
    const sourceIds = memoryPayload.source_message_ids;

    if (sourceIds.length) {
      await db.collection("chat").where({
        _id: dbCmd.in(sourceIds),
      }).remove();
    }

    return {
      code: 0,
      compressed: true,
      memoryId: memoryRes.id,
      removedCount: sourceIds.length,
      keepRecent,
      summary: memoryPayload.summary_text,
    };
  },

  async saveSettings(set, uid) {
    const dbJql = getDb(this);
    const inid = String(uid);
    const setting = dbJql.collection("setting");
    const existed = await setting.where({ user_id: inid }).limit(1).get();
    const payload = normalizeSettingPayload(set, inid);

    if (existed.data?.[0]?._id) {
      await setting.doc(existed.data[0]._id).update(payload);
      return;
    }

    await setting.add(payload);
  },

  async getSettings(uid) {
    const dbJql = getDb(this);
    const inid = String(uid);
    const reply = await dbJql.collection("setting").where({ user_id: inid }).get();

    return reply.data;
  },

  async updateSessionVisibility({ session_id, showPub }) {
    if (!session_id) {
      throw new Error("session_id is required");
    }

    const db = getRawDb();
    await db.collection("session").doc(String(session_id)).update({
      showPub: showPub === "public" ? "public" : "private",
    });

    return {
      code: 0,
      session_id: String(session_id),
      showPub: showPub === "public" ? "public" : "private",
    };
  },

  async requestSiliconFlow(messages, options = {}) {
    return requestSiliconFlowCompletion(messages, options);
  },

  async sendSessionMessage({ session_id, content, options = {} }) {
    const cleanContent = normalizeContent(content);

    if (!session_id) {
      throw new Error("session_id is required");
    }

    if (!cleanContent) {
      throw new Error("content is required");
    }

    const dbJql = getDb(this);
    const session = await getSessionDetailById(this, session_id);

    await saveMessageRecord(this, {
      session_id,
      role: "user",
      content: cleanContent,
      extra: null,
    });

    const maxMess = Number(options.maxMess || DEFAULT_CHAT_OPTIONS.maxMess);
    const historyLimit = maxMess > 0 ? maxMess : 100;

    const history = await dbJql
      .collection("chat")
      .where({ session_id })
      .orderBy("created_at", "desc")
      .limit(historyLimit)
      .get();

    const historyMessages = history.data
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

    const reply = await requestSiliconFlowCompletion(modelMessages, options);

    await saveMessageRecord(this, {
      session_id,
      role: "assistant",
      content: reply,
      extra: null,
    });

    return {
      code: 0,
      reply,
      session,
    };
  },

  async createStreamTask({ session_id, content, options = {} }) {
    const cleanContent = normalizeContent(content);

    if (!session_id) {
      throw new Error("session_id is required");
    }

    if (!cleanContent) {
      throw new Error("content is required");
    }

    const user_id = await getCurrentUserIdFromContext(this);
    const session = await getSessionDetailById(this, session_id);
    const dbJql = getDb(this);
    const taskToken = createTaskToken();

    await saveMessageRecord(this, {
      session_id,
      role: "user",
      content: cleanContent,
    });

    const created = await dbJql.collection("chat_stream").add({
      session_id,
      user_id,
      request_content: cleanContent,
      model_name: options.modelName || DEFAULT_CHAT_OPTIONS.modelName,
      status: "pending",
      task_token: taskToken,
      accumulated_text: "",
      error_message: "",
      options,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    return {
      code: 0,
      taskId: created.id,
      taskToken,
      session,
    };
  },

  async getStreamTask({ task_id }) {
    if (!task_id) {
      throw new Error("task_id is required");
    }

    const user_id = await getCurrentUserIdFromContext(this);
    const task = await getTaskRecord(this, task_id);

    if (!task || task.user_id !== user_id) {
      throw new Error("Stream task not found");
    }

    return {
      code: 0,
      taskId: task._id,
      status: task.status || "pending",
      text: task.accumulated_text || "",
      errorMessage: task.error_message || "",
      sessionId: task.session_id,
      updatedAt: task.updated_at || task.created_at || Date.now(),
    };
  },
};
