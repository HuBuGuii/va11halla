const chatHelper = uniCloud.importObject("chatHelper");

export async function getSessionDetail(sessionId) {
  return chatHelper.getSessionDetail(sessionId);
}

export async function createSession(title, systemText, showPub, avatar) {
  return chatHelper.createSession(title, systemText, showPub, avatar);
}

export async function copySession(sessionId) {
  return chatHelper.copySession(sessionId);
}

export async function getSessionPrompt(sessionId) {
  return chatHelper.getPrompt(sessionId);
}

export async function getSessionSettings(uid) {
  return chatHelper.getSettings(uid);
}

export async function saveSessionSettings(settings, uid) {
  return chatHelper.saveSettings(settings, uid);
}
