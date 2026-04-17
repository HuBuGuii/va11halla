const chatHelper = uniCloud.importObject("chatHelper");

export async function getSessions(uid = "") {
  if (uid) {
    return chatHelper.getSessions(uid);
  }

  const info = uniCloud.getCurrentUserInfo?.() || {};
  const currentUid = info.uid || "";
  if (!currentUid) {
    return [];
  }

  return chatHelper.getSessions(currentUid);
}

export async function getSessionDetail(sessionId) {
  return chatHelper.getSessionDetail(sessionId);
}

export async function getSessionSettings(uid) {
  return chatHelper.getSettings(uid);
}

export async function saveSessionSettings(settings, uid) {
  return chatHelper.saveSettings(settings, uid);
}

export async function updateSessionVisibility(sessionId, showPub) {
  return chatHelper.updateSessionVisibility({
    session_id: sessionId,
    showPub,
  });
}
