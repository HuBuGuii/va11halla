<template>
  <view class="chat-session">
    <ChatTopBar
      :status-bar-height="statusBarHeight"
      :title="pageTitle"
      subtitle="Friend Chat"
      :show-right="false"
      @back="goBack"
    />

    <scroll-view
      v-if="!initialLoading"
      scroll-y
      class="message-list"
      :scroll-into-view="scrollIntoView"
      scroll-with-animation
    >
      <view
        v-for="message in messages"
        :id="`message-${message.id}`"
        :key="message.id"
        class="message-row"
        :class="message.role === 'user' ? 'is-user' : 'is-assistant'"
      >
        <image class="avatar" :src="message.role === 'user' ? userAvatar : friendAvatar" />
        <view class="bubble-wrap">
          <view class="bubble" :class="{ 'is-error': message.status === 'error' }">
            <text class="bubble-text">{{ message.content }}</text>
          </view>
        </view>
      </view>
      <view id="message-bottom" class="bottom-anchor"></view>
    </scroll-view>

    <view v-else class="page-state">
      <text class="page-state-text">Loading messages...</text>
    </view>

    <ErrorBanner :text="errorText" @close="errorText = ''" />

    <view class="input-bar">
      <textarea
        v-model="inputText"
        class="chat-input"
        maxlength="-1"
        auto-height
        confirm-type="send"
        :disabled="sending"
        placeholder="Type your message"
        @confirm="handleSend"
      />
      <view class="input-actions">
        <button class="send-btn" :disabled="sending || !canSend" @click="handleSend">
          Send
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import ChatTopBar from "../components/ChatTopBar.vue";
import ErrorBanner from "../components/ErrorBanner.vue";
import {
  getFriendMessages,
  getOrCreateFriendSession,
  saveFriendMessage,
} from "../services/friendService";

const DEFAULT_AVATAR =
  "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/avatars/jill.png";

const statusBarHeight = ref(0);
const pageTitle = ref("Friend");
const userAvatar = ref(DEFAULT_AVATAR);
const friendAvatar = ref(DEFAULT_AVATAR);
const friendSessionId = ref("");
const friendUserId = ref("");
const currentUserId = ref("");
const inputText = ref("");
const messages = ref([]);
const sending = ref(false);
const initialLoading = ref(true);
const errorText = ref("");
const scrollIntoView = ref("message-bottom");

const canSend = computed(() => inputText.value.trim().length > 0);

async function scrollToBottom() {
  await nextTick();
  scrollIntoView.value = `message-bottom-${Date.now()}`;
  await nextTick();
  scrollIntoView.value = "message-bottom";
}

function mapFriendMessage(item) {
  return {
    id: String(item._id || `${item.created_at || Date.now()}`),
    role: String(item.sender_user_id || "") === String(currentUserId.value) ? "user" : "assistant",
    content: String(item.content || ""),
    status: "done",
  };
}

async function loadMessages() {
  if (!friendSessionId.value) {
    return;
  }

  const rows = await getFriendMessages(friendSessionId.value, 80);
  messages.value = rows.map(mapFriendMessage);
  await scrollToBottom();
}

async function handleSend() {
  const content = inputText.value.trim();
  if (!content || sending.value || !friendSessionId.value) {
    return;
  }

  sending.value = true;
  errorText.value = "";
  const optimistic = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    content,
    status: "loading",
  };
  messages.value.push(optimistic);
  inputText.value = "";
  await scrollToBottom();

  try {
    await saveFriendMessage(friendSessionId.value, content, null);
    optimistic.status = "done";
  } catch (error) {
    optimistic.status = "error";
    errorText.value = error?.message || "Send failed";
  } finally {
    sending.value = false;
  }
}

function goBack() {
  uni.navigateBack({ delta: 1 });
}

onLoad(async (options) => {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 0;

  const userInfo = uniCloud.getCurrentUserInfo?.() || {};
  currentUserId.value = String(userInfo.uid || "");
  friendUserId.value = String(options?.friend_user_id || "");
  pageTitle.value = decodeURIComponent(options?.friend_name || "Friend");
  friendAvatar.value = decodeURIComponent(options?.friend_avatar || DEFAULT_AVATAR);
  userAvatar.value = decodeURIComponent(options?.self_avatar || DEFAULT_AVATAR);

  try {
    if (options?.friend_session_id) {
      friendSessionId.value = String(options.friend_session_id);
    } else if (friendUserId.value) {
      const created = await getOrCreateFriendSession(friendUserId.value);
      friendSessionId.value = String(created?.session_id || "");
    } else {
      throw new Error("friend_user_id is required");
    }

    await loadMessages();
  } catch (error) {
    errorText.value = error?.message || "Failed to load friend session";
  } finally {
    initialLoading.value = false;
  }
});
</script>

<style scoped lang="scss">
page {
  height: 100%;
  overflow: hidden;
  background: #f7fbff;
}

.chat-session {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(255, 196, 226, 0.42), transparent 28%),
    radial-gradient(circle at top left, rgba(198, 230, 255, 0.46), transparent 26%),
    linear-gradient(180deg, #fdfefe 0%, #f3f9ff 48%, #fff7fc 100%);
  color: #2f3952;
}

.message-list {
  flex: 1;
  min-height: 0;
  padding: 28rpx 24rpx 12rpx;
  scrollbar-width: none;
}

.message-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 28rpx;
}

.message-row.is-user {
  flex-direction: row-reverse;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(163, 196, 255, 0.28);
}

.bubble-wrap {
  max-width: calc(100% - 110rpx);
  margin: 0 18rpx;
}

.bubble {
  padding: 22rpx 24rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(191, 212, 255, 0.46);
}

.message-row.is-user .bubble {
  background: linear-gradient(135deg, #89c6ff 0%, #f7b0d8 100%);
  color: #fff;
}

.bubble.is-error {
  border-color: rgba(255, 130, 171, 0.4);
}

.bubble-text {
  font-size: 30rpx;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.page-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-state-text {
  color: #7b8ec8;
  font-size: 28rpx;
}

.input-bar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 16rpx;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  border-top: 1px solid rgba(191, 212, 255, 0.36);
}

.chat-input {
  flex: 1;
  min-height: 128rpx;
  max-height: 240rpx;
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(174, 201, 255, 0.5);
  font-size: 30rpx;
  line-height: 1.6;
  box-sizing: border-box;
}

.input-actions {
  width: 180rpx;
}

.send-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border: none;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #86c9ff 0%, #f6a8d6 100%);
  color: #fff;
  font-size: 28rpx;
}

.send-btn[disabled] {
  opacity: 0.68;
}

.bottom-anchor {
  height: 2rpx;
}
</style>
