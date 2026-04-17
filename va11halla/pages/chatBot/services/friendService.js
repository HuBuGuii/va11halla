const chatHelper = uniCloud.importObject("chatHelper");

export async function addFriend(friendUserId, remark = "") {
  return chatHelper.addFriend({
    friend_user_id: friendUserId,
    remark,
  });
}

export async function getFriends() {
  const result = await chatHelper.getFriends();
  return result?.friends || [];
}

export async function getFriendSessions() {
  const result = await chatHelper.getFriendSessions();
  return result?.sessions || [];
}

export async function getOrCreateFriendSession(friendUserId) {
  return chatHelper.getOrCreateFriendSession({
    friend_user_id: friendUserId,
  });
}

export async function getFriendMessages(friendSessionId, limit = 50) {
  const result = await chatHelper.getFriendMessages({
    friend_session_id: friendSessionId,
    limit,
  });
  return result?.messages || [];
}

export async function saveFriendMessage(friendSessionId, content, extra = null) {
  return chatHelper.saveFriendMessage({
    friend_session_id: friendSessionId,
    content,
    extra,
  });
}
