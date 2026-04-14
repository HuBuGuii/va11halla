const chatHelper = uniCloud.importObject("chatHelper");

export function createLocalMessage(role, content, status = "done", extra = null) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    status,
    extra,
  };
}

export function stripLegacyAttachmentText(content = "") {
  return String(content)
    .replace(/\n?\[Attachments\][^\n]*/g, "")
    .trim();
}

export function formatFileSize(size = 0) {
  const value = Number(size) || 0;
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }
  return `${value} B`;
}

export function buildAttachmentLabel(attachment) {
  const typeLabel =
    attachment.kind === "image"
      ? "Image"
      : attachment.kind === "pdf"
        ? "PDF"
        : attachment.kind === "text"
          ? "Text"
          : "File";
  return `${typeLabel} · ${formatFileSize(attachment.size)}`;
}

export function sanitizeAttachmentsForStorage(attachments = []) {
  return attachments.map((item) => ({
    id: item.id,
    kind: item.kind,
    name: item.name,
    size: item.size,
    mimeType: item.mimeType,
    label: item.label || buildAttachmentLabel(item),
  }));
}

export function buildAttachmentSummary(attachments = []) {
  if (!attachments.length) {
    return "";
  }

  return attachments
    .map((item) => `${item.kind === "image" ? "image" : "file"}:${item.name}`)
    .join(", ");
}

export function buildUserMessageText(content, attachments = []) {
  const cleanText = String(content || "").trim();
  if (cleanText) {
    return cleanText;
  }

  if (!attachments.length) {
    return "";
  }

  const hasImage = attachments.some((item) => item.kind === "image");
  const hasPdf = attachments.some((item) => item.kind === "pdf");
  const hasTextFile = attachments.some((item) => item.kind === "text");

  if (hasImage) {
    return "请分析这张图片。";
  }

  if (hasPdf) {
    return "请阅读并总结这个 PDF。";
  }

  if (hasTextFile) {
    return "请阅读并总结这个文件。";
  }

  return "请分析附件内容。";
}

export async function getMessages(sessionId, limit = 50) {
  const result = await chatHelper.getMessages({
    session_id: sessionId,
    limit,
  });

  return (result?.messages || []).map((item, index) => ({
    id: item._id || `${index}-${item.created_at || Date.now()}`,
    role: item.role,
    content: item.content,
    status: "done",
    extra: item.extra || null,
  }));
}

export async function saveUserMessage(sessionId, content, extra = null) {
  return chatHelper.saveMessage({
    session_id: sessionId,
    role: "user",
    content,
    extra,
  });
}

export async function saveAssistantMessage(sessionId, content, extra = null) {
  return chatHelper.saveMessage({
    session_id: sessionId,
    role: "assistant",
    content,
    extra,
  });
}
