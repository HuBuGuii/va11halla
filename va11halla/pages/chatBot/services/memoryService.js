const chatHelper = uniCloud.importObject("chatHelper");

export async function getSessionMemories(sessionId, limit = 10) {
  const result = await chatHelper.getSessionMemories({
    session_id: sessionId,
    limit,
  });

  return result?.memories || [];
}

export async function compressSessionHistory(sessionId, options = {}) {
  return chatHelper.compressSessionHistory({
    session_id: sessionId,
    options,
  });
}
