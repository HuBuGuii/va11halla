export const CORE_EVENT_SCHEMA_VERSION = "v1";

export const CORE_EVENT_TYPES = [
  "goal",
  "preference",
  "fact",
  "decision",
  "emotion",
  "relationship_signal",
];

export const MEMORY_KINDS = [
  "compressed_events",
  "profile_memory",
  "manual_note",
];

export const MEMORY_STATUS = [
  "active",
  "archived",
  "exported",
];

export const GENERAL_MEMORY_TAGS = [
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

export const STYLE_TAGS = [
  "gentle",
  "playful",
  "serious",
  "rational",
  "expressive",
  "introverted",
  "outgoing",
];

export const SOCIAL_TAGS = [
  "wants_companionship",
  "open_to_chat",
  "prefers_gentle_tone",
  "prefers_humor",
  "shares_interests",
  "emotionally_expressive",
];

export const EMOTION_SIGNAL_TYPES = [
  "joy",
  "calm",
  "curiosity",
  "stress",
  "anxiety",
  "sadness",
  "loneliness",
  "excitement",
];

export function createEmptyCoreEvent() {
  return {
    type: "fact",
    title: "",
    summary: "",
    keywords: [],
    participants: ["user", "assistant"],
    importance: 0.5,
    confidence: 0.5,
    sourceMessageIds: [],
    timeStart: 0,
    timeEnd: 0,
  };
}

export function createEmptySessionMemory() {
  return {
    session_id: "",
    user_id: "",
    session_type: "private",
    memory_kind: "compressed_events",
    event_schema_version: CORE_EVENT_SCHEMA_VERSION,
    summary_text: "",
    events: [],
    source_message_ids: [],
    source_message_count: 0,
    time_range_start: 0,
    time_range_end: 0,
    tags: [],
    interest_tags: [],
    style_tags: [],
    social_tags: [],
    persona_signals: [],
    emotion_signals: [],
    status: "active",
    created_at: 0,
    updated_at: 0,
  };
}

export function normalizeCoreEvent(event = {}) {
  const normalizedType = CORE_EVENT_TYPES.includes(event.type) ? event.type : "fact";
  const keywords = Array.isArray(event.keywords)
    ? event.keywords.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
    : [];
  const participants = Array.isArray(event.participants) && event.participants.length
    ? event.participants.map((item) => String(item).trim()).filter(Boolean)
    : ["user", "assistant"];

  return {
    type: normalizedType,
    title: String(event.title || "").trim(),
    summary: String(event.summary || "").trim(),
    keywords,
    participants,
    importance: clampScore(event.importance, 0.5),
    confidence: clampScore(event.confidence, 0.5),
    sourceMessageIds: Array.isArray(event.sourceMessageIds)
      ? event.sourceMessageIds.map((item) => String(item)).filter(Boolean)
      : [],
    timeStart: Number(event.timeStart || 0),
    timeEnd: Number(event.timeEnd || 0),
  };
}

export function normalizeSessionMemory(memory = {}) {
  const normalizedKind = MEMORY_KINDS.includes(memory.memory_kind)
    ? memory.memory_kind
    : "compressed_events";
  const normalizedStatus = MEMORY_STATUS.includes(memory.status) ? memory.status : "active";

  return {
    session_id: String(memory.session_id || ""),
    user_id: String(memory.user_id || ""),
    session_type: memory.session_type === "public" ? "public" : "private",
    memory_kind: normalizedKind,
    event_schema_version: memory.event_schema_version || CORE_EVENT_SCHEMA_VERSION,
    summary_text: String(memory.summary_text || "").trim(),
    events: Array.isArray(memory.events) ? memory.events.map(normalizeCoreEvent) : [],
    source_message_ids: Array.isArray(memory.source_message_ids)
      ? memory.source_message_ids.map((item) => String(item)).filter(Boolean)
      : [],
    source_message_count: Number(memory.source_message_count || 0),
    time_range_start: Number(memory.time_range_start || 0),
    time_range_end: Number(memory.time_range_end || 0),
    tags: normalizeStringArray(memory.tags),
    interest_tags: normalizeEnumArray(memory.interest_tags, GENERAL_MEMORY_TAGS),
    style_tags: normalizeEnumArray(memory.style_tags, STYLE_TAGS),
    social_tags: normalizeEnumArray(memory.social_tags, SOCIAL_TAGS),
    persona_signals: normalizeStringArray(memory.persona_signals),
    emotion_signals: normalizeEmotionSignals(memory.emotion_signals),
    status: normalizedStatus,
    created_at: Number(memory.created_at || 0),
    updated_at: Number(memory.updated_at || 0),
  };
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function normalizeEnumArray(value, allowedValues) {
  return Array.isArray(value)
    ? value
        .map((item) => String(item).trim())
        .filter((item) => allowedValues.includes(item))
    : [];
}

function normalizeEmotionSignals(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      name: EMOTION_SIGNAL_TYPES.includes(item?.name) ? item.name : "calm",
      score: clampScore(item?.score, 0.5),
      polarity: ["positive", "neutral", "negative"].includes(item?.polarity)
        ? item.polarity
        : "neutral",
    }))
    .filter((item) => item.name);
}

function clampScore(value, fallback) {
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
