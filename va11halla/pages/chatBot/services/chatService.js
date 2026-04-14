import { getSessionDetail } from "./sessionService";
import {
  createLocalMessage,
  getMessages,
  saveAssistantMessage,
  saveUserMessage,
  sanitizeAttachmentsForStorage,
  buildUserMessageText,
} from "./messageService";
import {
  buildRequestMessages,
  resolveRequestModel,
  splitContextMessages,
  streamChatCompletion,
  DEFAULT_CONTEXT_LIMITS,
} from "./modelService";

export async function loadSessionContext(sessionId, options = {}) {
  const detail = await getSessionDetail(sessionId);
  const messages = await getMessages(sessionId, options.limit || 50);

  return {
    detail,
    messages,
  };
}

export function buildRequestContext({
  messages,
  memories = [],
  sessionSystemText,
  settings,
  attachments,
  fetchedModels,
  summaryText = "",
  contextLimits = DEFAULT_CONTEXT_LIMITS,
}) {
  const model = resolveRequestModel(settings.modelName, attachments, fetchedModels);
  const requestMessages = buildRequestMessages({
    messages,
    memories,
    systemText: sessionSystemText,
    maxMess: settings.maxMess,
    summaryText,
    limits: contextLimits,
  });

  return {
    model,
    messages: requestMessages,
    options: {
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      frequencyPenalty: settings.frequencyPenalty,
    },
  };
}

export async function persistConversation(sessionId, content, attachments, reply) {
  const userText = buildUserMessageText(content, attachments);
  const extra = attachments.length
    ? {
        attachments: sanitizeAttachmentsForStorage(attachments),
      }
    : null;

  const saveUserResult = await saveUserMessage(sessionId, userText, extra);
  if (saveUserResult?.code !== 0) {
    throw new Error("Failed to save user message");
  }

  const saveAssistantResult = await saveAssistantMessage(sessionId, reply || "Empty reply", null);
  if (saveAssistantResult?.code !== 0) {
    throw new Error("Failed to save assistant message");
  }

  return {
    userText,
    extra,
  };
}

const DEFAULT_SUMMARY_OPTIONS = {
  maxSummaryMessages: 10,
  maxSummaryCharsPerMessage: 120,
  maxSummaryCharsTotal: 900,
};

function summarizeMessageLine(message, maxChars = DEFAULT_SUMMARY_OPTIONS.maxSummaryCharsPerMessage) {
  const roleLabel = message.role === "assistant" ? "Assistant" : "User";
  const cleanContent = String(message.content || "").replace(/\s+/g, " ").trim();
  const attachmentCount = Array.isArray(message.extra?.attachments) ? message.extra.attachments.length : 0;
  const clipped = cleanContent.length > maxChars ? `${cleanContent.slice(0, maxChars)}...` : cleanContent;

  if (clipped) {
    return attachmentCount > 0 ? `${roleLabel}: ${clipped} [${attachmentCount} attachment(s)]` : `${roleLabel}: ${clipped}`;
  }

  if (attachmentCount > 0) {
    return `${roleLabel}: [${attachmentCount} attachment(s)]`;
  }

  return `${roleLabel}: [empty]`;
}

export function buildConversationSummary(messages = [], settings = {}, contextLimits = DEFAULT_CONTEXT_LIMITS) {
  const { archivedMessages } = splitContextMessages(messages, settings.maxMess, contextLimits);

  if (!archivedMessages.length) {
    return "";
  }

  const recentArchived = archivedMessages.slice(-DEFAULT_SUMMARY_OPTIONS.maxSummaryMessages);
  const lines = [];
  let totalChars = 0;

  for (const item of recentArchived) {
    const line = summarizeMessageLine(item);
    if (!line) {
      continue;
    }

    if (totalChars >= DEFAULT_SUMMARY_OPTIONS.maxSummaryCharsTotal) {
      break;
    }

    const remaining = DEFAULT_SUMMARY_OPTIONS.maxSummaryCharsTotal - totalChars;
    const clipped = line.length > remaining ? `${line.slice(0, remaining)}...` : line;
    lines.push(clipped);
    totalChars += clipped.length;
  }

  if (!lines.length) {
    return "";
  }

  const archivedCount = archivedMessages.length;
  return `Earlier conversation summary (${archivedCount} message${archivedCount > 1 ? "s" : ""} compressed):\n${lines.join("\n")}`;
}

export async function sendMessageWithContext({
  sessionId,
  content,
  attachments,
  sessionSystemText,
  settings,
  memories = [],
  fetchedModels,
  apiKey,
  apiUrl,
  currentMessages,
  onDelta,
  onBeforeSend,
  summaryText = "",
  contextLimits = DEFAULT_CONTEXT_LIMITS,
}) {
  const userText = buildUserMessageText(content, attachments);
  const userMessage = createLocalMessage(
    "user",
    userText,
    "done",
    attachments.length
      ? {
          attachments,
        }
      : null
  );
  const pendingMessage = createLocalMessage("assistant", "", "loading");
  const nextMessages = [...currentMessages, userMessage, pendingMessage];

  if (typeof onBeforeSend === "function") {
    await onBeforeSend({ userMessage, pendingMessage });
  }

  const effectiveSummary = summaryText || buildConversationSummary(currentMessages, settings, contextLimits);

  const requestContext = buildRequestContext({
    messages: nextMessages,
    memories,
    sessionSystemText,
    settings,
    attachments,
    fetchedModels,
    summaryText: effectiveSummary,
    contextLimits,
  });

  const reply = await streamChatCompletion({
    apiKey,
    apiUrl,
    model: requestContext.model,
    messages: requestContext.messages,
    temperature: requestContext.options.temperature,
    maxTokens: requestContext.options.maxTokens,
    frequencyPenalty: requestContext.options.frequencyPenalty,
    onDelta,
  });

  return {
    userMessage,
    pendingMessage,
    reply,
  };
}


