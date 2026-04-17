const crypto = require("crypto");
const uniId = require("uni-id-common");
const fs = require("fs");
const path = require("path");

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
const NUWA_SKILL_PATH = path.join(__dirname, "skills", "nuwa-skill-main", "SKILL.md");
let cachedNuwaSkillContext = null;

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

function loadNuwaSkillContext() {
  if (cachedNuwaSkillContext !== null) {
    return cachedNuwaSkillContext;
  }

  try {
    if (!fs.existsSync(NUWA_SKILL_PATH)) {
      cachedNuwaSkillContext = "";
      return cachedNuwaSkillContext;
    }

    const raw = fs.readFileSync(NUWA_SKILL_PATH, "utf8");
    const lines = String(raw || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    const picked = lines
      .filter((line) =>
        /心智|模型|启发|表达|反模式|边界|HOW they think|思维|决策/i.test(line)
      )
      .slice(0, 36);

    const normalized = picked.length
      ? picked.join("\n")
      : String(raw || "").slice(0, 2400);
    cachedNuwaSkillContext = clipText(normalized, 2400);
    return cachedNuwaSkillContext;
  } catch (error) {
    console.warn("[nuwa skill] failed to load local skill file", error);
    cachedNuwaSkillContext = "";
    return cachedNuwaSkillContext;
  }
}

function parseOptimizedPromptReply(replyText = "") {
  const raw = String(replyText || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const parsed = JSON.parse(extractJsonBlock(raw));
    return normalizeContent(parsed?.optimized_system_text || parsed?.systemText || "");
  } catch (error) {
    return raw.replace(/^```(?:json|markdown)?/i, "").replace(/```$/, "").trim();
  }
}

async function optimizePersonaSystemTextWithNuwa({
  title = "",
  description = "",
  systemText = "",
} = {}) {
  const cleanSystemText = normalizeContent(systemText);
  if (!cleanSystemText) {
    return {
      optimizedSystemText: "",
      optimized: false,
      skillLoaded: false,
    };
  }

  const nuwaContext = loadNuwaSkillContext();
  const systemPrompt = [
    "You are a persona-system-prompt optimizer.",
    "Your task is to improve raw persona prompts before they are persisted.",
    "Apply Nuwa distillation principles:",
    "1) expression DNA",
    "2) mental models",
    "3) decision heuristics",
    "4) anti-patterns",
    "5) honest boundaries",
    "Keep persona identity and user's core intent unchanged.",
    "Do not output policy text or tool instructions.",
    "Return strict JSON only: {\"optimized_system_text\":\"...\",\"summary\":\"...\"}.",
  ].join("\n");

  const payload = {
    persona_title: String(title || "").trim(),
    persona_description: String(description || "").trim(),
    original_system_text: cleanSystemText,
    nuwa_skill_reference: nuwaContext || "not_loaded",
    output_requirements: [
      "Use concise, executable role instructions.",
      "Include preferred tone and behavior constraints.",
      "Include explicit boundaries and refusal style.",
      "Keep language in Chinese if original text is Chinese.",
      "Length target: 220-800 Chinese chars.",
    ],
  };

  const reply = await requestSiliconFlowCompletion(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Optimize this persona prompt as requested:\n${JSON.stringify(payload)}`,
      },
    ],
    {
      modelName: DEFAULT_CHAT_OPTIONS.modelName,
      temperature: 0.35,
      maxTokens: 1800,
      topP: 0.8,
      topK: 40,
      frequencyPenalty: 0.2,
    }
  );

  const optimized = parseOptimizedPromptReply(reply);
  if (!optimized) {
    throw new Error("optimized persona prompt is empty");
  }

  return {
    optimizedSystemText: optimized,
    optimized: optimized !== cleanSystemText,
    skillLoaded: Boolean(nuwaContext),
  };
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

function normalizeTagSet(memory = {}) {
  const fromTags = Array.isArray(memory.tags) ? memory.tags : [];
  const fromInterest = Array.isArray(memory.interest_tags) ? memory.interest_tags : [];
  const merged = [...fromTags, ...fromInterest]
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  return Array.from(new Set(merged));
}

function calcJaccardSimilarity(tagsA = [], tagsB = []) {
  const setA = new Set(tagsA);
  const setB = new Set(tagsB);
  if (!setA.size || !setB.size) {
    return 0;
  }

  let intersection = 0;
  for (const value of setA) {
    if (setB.has(value)) {
      intersection += 1;
    }
  }

  const union = new Set([...setA, ...setB]).size;
  if (!union) {
    return 0;
  }

  return intersection / union;
}

function selectBestEvent(events = []) {
  if (!Array.isArray(events) || !events.length) {
    return null;
  }

  const ranked = [...events].sort((a, b) => Number(b?.importance || 0) - Number(a?.importance || 0));
  const picked = ranked[0] || {};
  return {
    type: String(picked.type || "fact"),
    title: clipText(picked.title || picked.summary || "", 80),
    summary: clipText(picked.summary || picked.title || "", 240),
  };
}

function normalizeFriendPair(userA, userB) {
  const idA = String(userA || "");
  const idB = String(userB || "");
  if (!idA || !idB) {
    throw new Error("invalid friend pair");
  }

  if (idA === idB) {
    throw new Error("cannot add self as friend");
  }

  return idA < idB ? [idA, idB] : [idB, idA];
}

async function ensureFriendship(db, userA, userB) {
  const [user_low, user_high] = normalizeFriendPair(userA, userB);
  const relationRes = await db
    .collection("friend_relation")
    .where({
      user_low,
      user_high,
      status: "accepted",
    })
    .limit(1)
    .get();

  return relationRes.data?.[0] || null;
}

async function ensureFriendSession(db, userA, userB) {
  const [user_low, user_high] = normalizeFriendPair(userA, userB);
  const existed = await db
    .collection("friend_session")
    .where({ user_low, user_high })
    .limit(1)
    .get();

  if (existed.data?.[0]) {
    return existed.data[0];
  }

  const now = Date.now();
  const created = await db.collection("friend_session").add({
    user_low,
    user_high,
    created_at: now,
    updated_at: now,
    last_message_at: now,
  });

  return {
    _id: created.id,
    user_low,
    user_high,
    created_at: now,
    updated_at: now,
    last_message_at: now,
  };
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

  async getNuwaSkillStatus() {
    let exists = false;
    let size = 0;
    let skillPath = NUWA_SKILL_PATH;

    try {
      exists = fs.existsSync(NUWA_SKILL_PATH);
      if (exists) {
        size = Number(fs.statSync(NUWA_SKILL_PATH)?.size || 0);
      }
    } catch (error) {
      console.warn("[nuwa skill] status check failed", error);
    }

    const context = loadNuwaSkillContext();
    return {
      code: 0,
      exists,
      size,
      path: skillPath,
      loadedContextChars: String(context || "").length,
    };
  },

  async optimizePersonaSystemText({
    title = "",
    description = "",
    systemText = "",
  } = {}) {
    const result = await optimizePersonaSystemTextWithNuwa({
      title,
      description,
      systemText,
    });

    return {
      code: 0,
      optimizedSystemText: result.optimizedSystemText,
      optimized: result.optimized,
      skillLoaded: result.skillLoaded,
    };
  },

  async getRecommendedEvents({
    session_id,
    limit = 5,
    minSimilarity = 0.35,
  } = {}) {
    if (!session_id) {
      throw new Error("session_id is required");
    }

    const db = getRawDb();
    const dbCmd = getDbCommand();
    const currentUserId = await getCurrentUserIdFromContext(this);

    const targetMemoriesRes = await db
      .collection("session_memory")
      .where({
        session_id: String(session_id),
        status: "active",
      })
      .orderBy("created_at", "desc")
      .limit(6)
      .get();
    const targetMemories = targetMemoriesRes.data || [];

    const targetTagSet = Array.from(
      new Set(targetMemories.flatMap((item) => normalizeTagSet(item)))
    );
    if (!targetTagSet.length) {
      return {
        code: 0,
        recommendations: [],
      };
    }

    const candidateRes = await db
      .collection("session_memory")
      .where({
        status: "active",
        session_type: "public",
        session_id: dbCmd.neq(String(session_id)),
        user_id: dbCmd.neq(String(currentUserId)),
      })
      .orderBy("created_at", "desc")
      .limit(240)
      .get();
    const candidates = candidateRes.data || [];
    if (!candidates.length) {
      return {
        code: 0,
        recommendations: [],
      };
    }

    const sessionCache = new Map();
    const personaCache = new Map();
    const rows = [];

    for (const item of candidates) {
      const candidateTags = normalizeTagSet(item);
      const similarity = calcJaccardSimilarity(targetTagSet, candidateTags);
      if (similarity < Number(minSimilarity)) {
        continue;
      }

      const event = selectBestEvent(item.events || []);
      if (!event || (!event.title && !event.summary)) {
        continue;
      }

      let sourceSession = sessionCache.get(String(item.session_id));
      if (sourceSession === undefined) {
        sourceSession = await getRawSessionById(item.session_id);
        sessionCache.set(String(item.session_id), sourceSession || null);
      }

      let persona = null;
      const personaId = String(sourceSession?.persona_id || "");
      if (personaId) {
        if (personaCache.has(personaId)) {
          persona = personaCache.get(personaId);
        } else {
          persona = await getRawPersonaById(personaId);
          personaCache.set(personaId, persona || null);
        }
      }

      const styleTags = Array.isArray(item.style_tags) ? item.style_tags : [];
      const styleHint = [
        persona?.title ? `persona:${persona.title}` : "",
        styleTags.length ? `style:${styleTags.join("/")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      rows.push({
        id: String(item._id),
        source_user_id: String(item.user_id || ""),
        source_session_id: String(item.session_id || ""),
        similarity: Number(similarity.toFixed(3)),
        tags: candidateTags,
        summary_text: String(item.summary_text || ""),
        style_tags: styleTags,
        emotion_signals: Array.isArray(item.emotion_signals) ? item.emotion_signals : [],
        style_hint: styleHint,
        event,
      });
    }

    const dedupByUser = new Map();
    for (const row of rows.sort((a, b) => b.similarity - a.similarity)) {
      const key = `${row.source_user_id}#${row.event.title || row.event.summary}`;
      if (!dedupByUser.has(key)) {
        dedupByUser.set(key, row);
      }
    }

    const picked = Array.from(dedupByUser.values()).slice(0, Math.max(1, Number(limit) || 5));
    const sourceUserIds = Array.from(new Set(picked.map((item) => item.source_user_id))).filter(Boolean);
    let userMap = new Map();
    if (sourceUserIds.length) {
      const usersRes = await db
        .collection("uni-id-users")
        .where({
          _id: dbCmd.in(sourceUserIds),
        })
        .field("_id,nickname,avatar_file")
        .get();
      userMap = new Map((usersRes.data || []).map((item) => [String(item._id), item]));
    }

    const withUserInfo = picked.map((item) => {
      const userInfo = userMap.get(String(item.source_user_id)) || {};
      return {
        ...item,
        source_user_name: userInfo.nickname || "",
        source_user_avatar: userInfo.avatar_file?.url || "",
      };
    });

    return {
      code: 0,
      recommendations: withUserInfo,
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
    optimizeSystemText = true,
  } = {}) {
    const db = getRawDb();
    const user_id = await getCurrentUserIdFromContext(this);
    const userRes = await db.collection("uni-id-users").doc(user_id).get();
    const nickname = userRes.data?.[0]?.nickname || "";
    const now = Date.now();
    let finalSystemText = systemText || "";
    let optimizationInfo = {
      optimized: false,
      skillLoaded: false,
      fallback: false,
    };

    if (optimizeSystemText && normalizeContent(systemText)) {
      try {
        const optimized = await optimizePersonaSystemTextWithNuwa({
          title,
          description,
          systemText,
        });
        finalSystemText = optimized.optimizedSystemText || finalSystemText;
        optimizationInfo = {
          optimized: Boolean(optimized.optimized),
          skillLoaded: Boolean(optimized.skillLoaded),
          fallback: false,
        };
      } catch (error) {
        console.warn("[persona optimize] failed, fallback to raw systemText", error);
        optimizationInfo = {
          optimized: false,
          skillLoaded: Boolean(loadNuwaSkillContext()),
          fallback: true,
        };
      }
    }

    const created = await db.collection("persona").add({
      user_id,
      belong: nickname,
      title: title || "Persona",
      description: description || "",
      systemText: finalSystemText || "",
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
      optimization: optimizationInfo,
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

  async addFriend({
    friend_user_id,
    remark = "",
  } = {}) {
    if (!friend_user_id) {
      throw new Error("friend_user_id is required");
    }

    const db = getRawDb();
    const user_id = await getCurrentUserIdFromContext(this);
    const [user_low, user_high] = normalizeFriendPair(user_id, friend_user_id);
    const now = Date.now();

    const existed = await db
      .collection("friend_relation")
      .where({ user_low, user_high })
      .limit(1)
      .get();
    const current = existed.data?.[0];

    if (current?._id) {
      await db.collection("friend_relation").doc(String(current._id)).update({
        status: "accepted",
        updated_at: now,
        last_operator_id: String(user_id),
        remark: clipText(remark, 80),
      });
    } else {
      await db.collection("friend_relation").add({
        user_low,
        user_high,
        status: "accepted",
        created_by: String(user_id),
        last_operator_id: String(user_id),
        remark: clipText(remark, 80),
        created_at: now,
        updated_at: now,
      });
    }

    return {
      code: 0,
      user_low,
      user_high,
      status: "accepted",
    };
  },

  async getFriends() {
    const db = getRawDb();
    const currentUserId = await getCurrentUserIdFromContext(this);
    const dbCmd = getDbCommand();

    const relationRes = await db
      .collection("friend_relation")
      .where(
        dbCmd.and([
          { status: "accepted" },
          dbCmd.or([
            { user_low: String(currentUserId) },
            { user_high: String(currentUserId) },
          ]),
        ])
      )
      .orderBy("updated_at", "desc")
      .get();
    const relations = relationRes.data || [];

    const friendIds = Array.from(
      new Set(
        relations.map((item) =>
          item.user_low === String(currentUserId) ? String(item.user_high) : String(item.user_low)
        )
      )
    );

    if (!friendIds.length) {
      return {
        code: 0,
        friends: [],
      };
    }

    const userRes = await db
      .collection("uni-id-users")
      .where({
        _id: dbCmd.in(friendIds),
      })
      .field("_id,nickname,avatar_file")
      .get();
    const userMap = new Map((userRes.data || []).map((item) => [String(item._id), item]));

    return {
      code: 0,
      friends: friendIds.map((friendId) => {
        const relation = relations.find(
          (item) => String(item.user_low) === friendId || String(item.user_high) === friendId
        );
        const info = userMap.get(friendId) || {};
        return {
          user_id: friendId,
          nickname: info.nickname || "Friend",
          avatar: info.avatar_file?.url || "",
          remark: relation?.remark || "",
          updated_at: Number(relation?.updated_at || 0),
        };
      }),
    };
  },

  async getOrCreateFriendSession({ friend_user_id } = {}) {
    if (!friend_user_id) {
      throw new Error("friend_user_id is required");
    }

    const db = getRawDb();
    const currentUserId = await getCurrentUserIdFromContext(this);
    const relation = await ensureFriendship(db, currentUserId, friend_user_id);
    if (!relation) {
      throw new Error("friend relation not found");
    }

    const session = await ensureFriendSession(db, currentUserId, friend_user_id);
    return {
      code: 0,
      session_id: String(session._id),
      friend_user_id: String(friend_user_id),
    };
  },

  async getFriendMessages({
    friend_session_id,
    limit = 50,
  } = {}) {
    if (!friend_session_id) {
      throw new Error("friend_session_id is required");
    }

    const db = getRawDb();
    const currentUserId = await getCurrentUserIdFromContext(this);
    const sessionRes = await db.collection("friend_session").doc(String(friend_session_id)).get();
    const session = sessionRes.data?.[0];
    if (!session) {
      throw new Error("friend session not found");
    }

    const userLow = String(session.user_low || "");
    const userHigh = String(session.user_high || "");
    if (String(currentUserId) !== userLow && String(currentUserId) !== userHigh) {
      throw new Error("permission denied");
    }

    const res = await db
      .collection("friend_message")
      .where({ friend_session_id: String(friend_session_id) })
      .orderBy("created_at", "desc")
      .limit(Math.max(1, Number(limit) || 50))
      .get();
    const rows = (res.data || []).reverse();

    return {
      code: 0,
      messages: rows,
      participants: [userLow, userHigh],
    };
  },

  async saveFriendMessage({
    friend_session_id,
    content,
    extra = null,
  } = {}) {
    const cleanContent = normalizeContent(content);
    if (!friend_session_id) {
      throw new Error("friend_session_id is required");
    }
    if (!cleanContent) {
      throw new Error("content is required");
    }

    const db = getRawDb();
    const currentUserId = await getCurrentUserIdFromContext(this);
    const now = Date.now();
    const sessionRes = await db.collection("friend_session").doc(String(friend_session_id)).get();
    const session = sessionRes.data?.[0];
    if (!session) {
      throw new Error("friend session not found");
    }

    const userLow = String(session.user_low || "");
    const userHigh = String(session.user_high || "");
    if (String(currentUserId) !== userLow && String(currentUserId) !== userHigh) {
      throw new Error("permission denied");
    }

    const friend_user_id = String(currentUserId) === userLow ? userHigh : userLow;
    const created = await db.collection("friend_message").add({
      friend_session_id: String(friend_session_id),
      sender_user_id: String(currentUserId),
      receiver_user_id: String(friend_user_id),
      content: cleanContent,
      extra,
      created_at: now,
    });

    await db.collection("friend_session").doc(String(friend_session_id)).update({
      updated_at: now,
      last_message_at: now,
      last_message_preview: clipText(cleanContent, 80),
    });

    return {
      code: 0,
      message_id: created.id,
    };
  },

  async getFriendSessions() {
    const db = getRawDb();
    const dbCmd = getDbCommand();
    const currentUserId = await getCurrentUserIdFromContext(this);

    const sessionsRes = await db
      .collection("friend_session")
      .where(
        dbCmd.or([
          { user_low: String(currentUserId) },
          { user_high: String(currentUserId) },
        ])
      )
      .orderBy("last_message_at", "desc")
      .get();
    const sessions = sessionsRes.data || [];
    const friendIds = Array.from(
      new Set(
        sessions.map((item) =>
          String(item.user_low) === String(currentUserId)
            ? String(item.user_high)
            : String(item.user_low)
        )
      )
    );

    if (!friendIds.length) {
      return {
        code: 0,
        sessions: [],
      };
    }

    const userRes = await db
      .collection("uni-id-users")
      .where({
        _id: dbCmd.in(friendIds),
      })
      .field("_id,nickname,avatar_file")
      .get();
    const userMap = new Map((userRes.data || []).map((item) => [String(item._id), item]));

    return {
      code: 0,
      sessions: sessions.map((item) => {
        const friendId =
          String(item.user_low) === String(currentUserId)
            ? String(item.user_high)
            : String(item.user_low);
        const friendInfo = userMap.get(friendId) || {};
        return {
          session_id: String(item._id),
          friend_user_id: friendId,
          friend_nickname: friendInfo.nickname || "Friend",
          friend_avatar: friendInfo.avatar_file?.url || "",
          last_message_preview: item.last_message_preview || "",
          last_message_at: Number(item.last_message_at || item.updated_at || 0),
        };
      }),
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
