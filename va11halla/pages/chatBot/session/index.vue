<template>
  <view class="chat-session">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-btn" @click="goBack">
        <uni-icons type="left" size="22" color="#1f2937" />
      </view>
      <view class="nav-title">
        <view class="title-group">
          <text class="title-text">{{ pageTitle }}</text>
          <text class="model-text">{{ currentModelLabel }}</text>
        </view>
      </view>
      <view class="nav-btn" @click="openModelSelector">
        <uni-icons type="gear" size="20" color="#1f2937" />
      </view>
    </view>

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
        <image class="avatar" :src="message.role === 'user' ? userAvatar : botAvatar" />
        <view class="bubble-wrap">
          <view
            class="bubble"
            :class="{
              'is-error': message.status === 'error',
              'is-loading': message.status === 'loading',
            }"
          >
            <text class="bubble-text">{{ message.content }}</text>
            <view v-if="message.extra?.attachments?.length" class="attachment-list">
              <view
                v-for="attachment in message.extra.attachments"
                :key="attachment.id"
                class="attachment-card"
              >
                <image
                  v-if="attachment.kind === 'image' && attachment.previewUrl"
                  class="attachment-image"
                  :src="attachment.previewUrl"
                  mode="aspectFill"
                />
                <view class="attachment-meta">
                  <text class="attachment-name">{{ attachment.name }}</text>
                  <text class="attachment-info">{{ attachment.label }}</text>
                </view>
              </view>
            </view>
          </view>
          <text v-if="message.status === 'loading'" class="message-status">Thinking...</text>
          <text v-if="message.status === 'error'" class="message-status error-text">
            Send failed. Retry later.
          </text>
        </view>
      </view>
      <view id="message-bottom" class="bottom-anchor"></view>
    </scroll-view>

    <view v-else class="page-state">
      <text class="page-state-text">Loading messages...</text>
    </view>

    <view v-if="!initialLoading && messages.length === 0" class="page-state empty-state">
      <text class="page-state-text">No messages yet. Start the conversation.</text>
    </view>

    <view v-if="errorText" class="error-banner">
      <text class="error-banner-text">{{ errorText }}</text>
      <view class="error-close" @click="closeErrorBanner">
        <uni-icons type="closeempty" size="16" color="#6b7aa6" />
      </view>
    </view>

    <view class="settings-layer">
      <uni-popup ref="settingsPopupRef" type="center">
        <view class="settings-panel">
          <view class="settings-header">
            <text class="settings-title">Chat Settings</text>
            <view class="settings-close" @click="closeSettings">
              <uni-icons type="closeempty" size="18" color="#7f8fb3" />
            </view>
          </view>

          <view class="settings-body">
            <view class="settings-scroll">
              <uni-forms
                ref="settingsFormRef"
                :modelValue="settingsForm"
                class="settings-form"
                label-position="top"
              >
                <uni-forms-item label="Session Visibility" name="showPub">
                  <view class="settings-chip-group">
                    <view
                      v-for="item in visibilityOptions"
                      :key="`visibility-${item.value}`"
                      class="settings-chip"
                      :class="{ 'is-active': settingsForm.showPub === item.value }"
                      @click="settingsForm.showPub = item.value"
                    >
                      <text class="settings-chip-text">{{ item.text }}</text>
                    </view>
                  </view>
                </uni-forms-item>

                <uni-forms-item label="Recommended" name="recommendedModel">
                  <view class="recommended-models">
                    <view
                      v-for="item in MODEL_OPTIONS"
                      :key="item.value"
                      class="recommended-chip"
                      :class="{ 'is-active': settingsForm.modelName === item.value }"
                      @click="selectRecommendedModel(item.value)"
                    >
                      <text class="recommended-chip-text">{{ item.label }}</text>
                    </view>
                  </view>
                </uni-forms-item>

                <uni-forms-item label="All Models" name="modelName">
                  <uni-data-select
                    v-model="settingsForm.modelName"
                    :localdata="availableModelOptions"
                    mode="picker"
                    selectedColor="#6d8cff"
                    placeholder="Select a model"
                  />
                  <text class="field-tip">
                    {{ modelsLoading ? "Loading official models..." : `Loaded ${availableModelOptions.length} models` }}
                  </text>
                </uni-forms-item>

                <uni-forms-item label="Temperature" name="temperature">
                  <view class="settings-chip-group">
                    <view
                      v-for="item in temperatureOptions"
                      :key="`temp-${item.value}`"
                      class="settings-chip"
                      :class="{ 'is-active': settingsForm.temperature === item.value }"
                      @click="settingsForm.temperature = item.value"
                    >
                      <text class="settings-chip-text">{{ item.text }}</text>
                    </view>
                  </view>
                </uni-forms-item>

                <uni-forms-item label="Max Tokens" name="maxTokens">
                  <view class="settings-chip-group">
                    <view
                      v-for="item in maxTokenOptions"
                      :key="`token-${item.value}`"
                      class="settings-chip"
                      :class="{ 'is-active': settingsForm.maxTokens === item.value }"
                      @click="settingsForm.maxTokens = item.value"
                    >
                      <text class="settings-chip-text">{{ item.text }}</text>
                    </view>
                  </view>
                </uni-forms-item>

                <uni-forms-item label="Penalty" name="frequencyPenalty">
                  <view class="settings-chip-group">
                    <view
                      v-for="item in frequencyPenaltyOptions"
                      :key="`penalty-${item.value}`"
                      class="settings-chip"
                      :class="{ 'is-active': settingsForm.frequencyPenalty === item.value }"
                      @click="settingsForm.frequencyPenalty = item.value"
                    >
                      <text class="settings-chip-text">{{ item.text }}</text>
                    </view>
                  </view>
                </uni-forms-item>

                <uni-forms-item label="Context Size" name="maxMess">
                  <view class="settings-chip-group">
                    <view
                      v-for="item in maxMessageOptions"
                      :key="`context-${item.value}`"
                      class="settings-chip"
                      :class="{ 'is-active': settingsForm.maxMess === item.value }"
                      @click="settingsForm.maxMess = item.value"
                    >
                      <text class="settings-chip-text">{{ item.text }}</text>
                    </view>
                  </view>
                </uni-forms-item>
              </uni-forms>
            </view>
          </view>

          <view class="settings-footer">
            <button class="settings-cancel-btn" @click="closeSettings">Cancel</button>
            <button class="settings-confirm-btn" @click="confirmSettings">Confirm</button>
          </view>
        </view>
      </uni-popup>
    </view>

    <view v-if="selectedAttachments.length" class="composer-attachments">
      <view
        v-for="attachment in selectedAttachments"
        :key="attachment.id"
        class="composer-attachment-card"
      >
        <image
          v-if="attachment.kind === 'image' && attachment.previewUrl"
          class="composer-attachment-image"
          :src="attachment.previewUrl"
          mode="aspectFill"
        />
        <view class="composer-attachment-meta">
          <text class="composer-attachment-name">{{ attachment.name }}</text>
          <text class="composer-attachment-info">{{ attachment.label }}</text>
        </view>
        <view class="composer-attachment-remove" @click="removeAttachment(attachment.id)">
          <uni-icons type="closeempty" size="14" color="#7d8cb4" />
        </view>
      </view>
    </view>

    <view class="input-bar">
      <view class="attach-btn" @click="openAttachmentPicker">
        <uni-icons type="plusempty" size="20" color="#6b7ec0" />
      </view>
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
        <button class="ghost-btn" :disabled="sending || initialLoading" @click="reloadSession">
          Refresh
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getMessages as getMessageList } from "../services/messageService";
import {
  buildConversationSummary,
  sendMessageWithContext,
  persistConversation,
} from "../services/chatService";
import {
  compressSessionHistory,
  getSessionMemories,
} from "../services/memoryService";
import {
  getSessionDetail as fetchSessionDetail,
  getSessionSettings,
  saveSessionSettings,
  updateSessionVisibility,
} from "../services/sessionService";
import { pickAttachments } from "../services/fileService";
import { getAvailableModels } from "../services/modelService";

const DEFAULT_BOT_AVATAR =
  "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/avatars/jill.png";
const MODEL_STORAGE_KEY = "chatbot:selectedModel";
const SETTINGS_STORAGE_KEY = "chatbot:settings";
const SILICONFLOW_API_KEY = "sk-lbzbllxviwaybcnynwqpqucqjmkcirhggutrpbqlgaqrphti";
const SILICONFLOW_API_URL = "https://api.siliconflow.cn/v1/chat/completions";
const MODEL_OPTIONS = [
  {
    label: "DeepSeek V3.2",
    value: "deepseek-ai/DeepSeek-V3.2",
  },
  {
    label: "DeepSeek R1",
    value: "deepseek-ai/DeepSeek-R1",
  },
  {
    label: "Qwen 3.5 122B",
    value: "Qwen/Qwen3.5-122B-A10B",
  },
  {
    label: "Qwen 3.5 9B",
    value: "Qwen/Qwen3.5-9B",
  },
];
const DEFAULT_CHAT_SETTINGS = {
  modelName: MODEL_OPTIONS[0].value,
  temperature: 0.7,
  maxTokens: 1024,
  maxMess: 8,
  frequencyPenalty: 0.5,
};
const temperatureOptions = [
  { text: "Focused 0.3", value: 0.3 },
  { text: "Balanced 0.7", value: 0.7 },
  { text: "Creative 0.9", value: 0.9 },
];
const maxTokenOptions = [
  { text: "512", value: 512 },
  { text: "1024", value: 1024 },
  { text: "2048", value: 2048 },
  { text: "4096", value: 4096 },
];
const frequencyPenaltyOptions = [
  { text: "0.0", value: 0 },
  { text: "0.5", value: 0.5 },
  { text: "0.8", value: 0.8 },
  { text: "1.0", value: 1 },
];
const visibilityOptions = [
  { text: "Private", value: "private" },
  { text: "Public", value: "public" },
];
const maxMessageOptions = [
  { text: "6 messages", value: 6 },
  { text: "8 messages", value: 8 },
  { text: "10 messages", value: 10 },
];

const sessionId = ref("");
const pageTitle = ref("Chat");
const sessionSystemText = ref("");
const botAvatar = ref(DEFAULT_BOT_AVATAR);
const userAvatar = ref(
  "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/%23TimBeta.jpg"
);
const statusBarHeight = ref(0);
const inputText = ref("");
const sending = ref(false);
const initialLoading = ref(true);
const errorText = ref("");
const scrollIntoView = ref("message-bottom");
const messages = ref([]);
const sessionMemories = ref([]);
const selectedAttachments = ref([]);
const hasLoadedOnce = ref(false);
const currentUserId = ref("");
const modelsLoading = ref(false);
const fetchedModels = ref([]);
const settingsPopupRef = ref(null);
const settingsFormRef = ref(null);
const settingsForm = reactive({
  ...DEFAULT_CHAT_SETTINGS,
  showPub: "private",
});
const contextSummary = ref("");
const compressionState = reactive({
  running: false,
  timer: null,
});

const MEMORY_COMPRESSION_BUFFER = 6;
const MEMORY_COMPRESSION_DELAY = 1800;

const canSend = computed(
  () => inputText.value.trim().length > 0 || selectedAttachments.value.length > 0
);
const availableModelOptions = computed(() => {
  const recommended = MODEL_OPTIONS.map((item) => ({
    text: `${item.label} - Recommended`,
    value: item.value,
  }));
  const recommendedSet = new Set(MODEL_OPTIONS.map((item) => item.value));
  const fetched = fetchedModels.value
    .filter((item) => item?.value && !recommendedSet.has(item.value))
    .sort((a, b) => a.text.localeCompare(b.text));

  return [...recommended, ...fetched];
});
const currentModelLabel = computed(() => {
  const matchedRecommended = MODEL_OPTIONS.find((item) => item.value === settingsForm.modelName);
  const matchedFetched = fetchedModels.value.find((item) => item.value === settingsForm.modelName);
  return matchedRecommended?.label || matchedFetched?.text || settingsForm.modelName;
});

async function scrollToBottom() {
  await nextTick();
  scrollIntoView.value = `message-bottom-${Date.now()}`;
  await nextTick();
  scrollIntoView.value = "message-bottom";
}

function normalizeSettings() {
  const normalizedModel = settingsForm.modelName || DEFAULT_CHAT_SETTINGS.modelName;
  const normalizedTemperature = Number(settingsForm.temperature);
  const normalizedMaxTokens = Number(settingsForm.maxTokens);
  const normalizedMaxMess = Number(settingsForm.maxMess);
  const normalizedFrequencyPenalty = Number(settingsForm.frequencyPenalty);
  const normalizedShowPub = settingsForm.showPub === "public" ? "public" : "private";

  settingsForm.modelName = normalizedModel;
  settingsForm.temperature = temperatureOptions.some((item) => item.value === normalizedTemperature)
    ? normalizedTemperature
    : DEFAULT_CHAT_SETTINGS.temperature;
  settingsForm.maxTokens = maxTokenOptions.some((item) => item.value === normalizedMaxTokens)
    ? normalizedMaxTokens
    : DEFAULT_CHAT_SETTINGS.maxTokens;
  settingsForm.maxMess = maxMessageOptions.some((item) => item.value === normalizedMaxMess)
    ? normalizedMaxMess
    : DEFAULT_CHAT_SETTINGS.maxMess;
  settingsForm.frequencyPenalty = frequencyPenaltyOptions.some(
    (item) => item.value === normalizedFrequencyPenalty
  )
    ? normalizedFrequencyPenalty
    : DEFAULT_CHAT_SETTINGS.frequencyPenalty;
  settingsForm.showPub = normalizedShowPub;
}

function persistModel(modelName) {
  settingsForm.modelName = modelName;
  uni.setStorageSync(MODEL_STORAGE_KEY, modelName);
}

function persistSettings() {
  normalizeSettings();
  const settingsSnapshot = {
    modelName: settingsForm.modelName,
    temperature: Number(settingsForm.temperature),
    maxTokens: Number(settingsForm.maxTokens),
    maxMess: Number(settingsForm.maxMess),
    frequencyPenalty: Number(settingsForm.frequencyPenalty),
    showPub: settingsForm.showPub,
  };

  Object.assign(settingsForm, settingsSnapshot);
  uni.setStorageSync(SETTINGS_STORAGE_KEY, settingsSnapshot);
  persistModel(settingsSnapshot.modelName);
}

function restoreSettings() {
  const cachedModel = uni.getStorageSync(MODEL_STORAGE_KEY);
  const cachedSettings = uni.getStorageSync(SETTINGS_STORAGE_KEY);

  if (cachedSettings) {
    Object.assign(settingsForm, {
      ...DEFAULT_CHAT_SETTINGS,
      ...cachedSettings,
    });
  }

  if (cachedModel) {
    settingsForm.modelName = cachedModel;
  }

  normalizeSettings();
}

function closeErrorBanner() {
  errorText.value = "";
}

function removeAttachment(attachmentId) {
  selectedAttachments.value = selectedAttachments.value.filter((item) => item.id !== attachmentId);
}

async function openAttachmentPicker() {
  if (sending.value) {
    return;
  }

  try {
    const picked = await pickAttachments(selectedAttachments.value.length);
    selectedAttachments.value = [...selectedAttachments.value, ...picked];
  } catch (error) {
    errorText.value = error?.message || "Failed to add attachment";
  }
}

async function fetchModels() {
  if (!SILICONFLOW_API_KEY || modelsLoading.value) {
    return;
  }

  modelsLoading.value = true;
  try {
    fetchedModels.value = await getAvailableModels(SILICONFLOW_API_KEY);
  } catch (error) {
    errorText.value = error?.message || "Failed to load official models";
  } finally {
    modelsLoading.value = false;
  }
}

async function loadSettings() {
  restoreSettings();

  const currentUserInfo = uniCloud.getCurrentUserInfo?.() || {};
  currentUserId.value = currentUserInfo.uid || "";

  if (!currentUserId.value) {
    return;
  }

  try {
    const saved = await getSessionSettings(currentUserId.value);
    const latest = saved?.[0];

    if (!latest) {
      return;
    }

    Object.assign(settingsForm, {
      modelName: latest.modelName || settingsForm.modelName,
      temperature: Number(latest.temperature ?? settingsForm.temperature),
      maxTokens: Number(latest.maxTokens ?? settingsForm.maxTokens),
      maxMess: Number(latest.maxMess ?? settingsForm.maxMess),
      frequencyPenalty: Number(
        latest.frequencyPenalty ?? latest.repeat ?? settingsForm.frequencyPenalty
      ),
    });

    persistSettings();
  } catch (error) {
    console.warn("[chat settings] failed to load cloud settings", error);
  }
}

async function loadMessages() {
  if (!sessionId.value) {
    return;
  }

  try {
    messages.value = await getMessageList(sessionId.value, 50);
    contextSummary.value = buildConversationSummary(messages.value, settingsForm);
    await scrollToBottom();
  } catch (error) {
    errorText.value = error?.message || "Failed to load messages";
  }
}

async function loadMemories() {
  if (!sessionId.value) {
    return;
  }

  try {
    sessionMemories.value = await getSessionMemories(sessionId.value, 6);
  } catch (error) {
    console.warn("[chat memory] failed to load memories", error);
  }
}

async function compressHistoryIfNeeded() {
  if (!sessionId.value) {
    return false;
  }

  if (compressionState.running) {
    return false;
  }

  const keepRecent = Number(settingsForm.maxMess || 8);
  const shouldCompress = messages.value.length > keepRecent + MEMORY_COMPRESSION_BUFFER;
  if (!shouldCompress) {
    return false;
  }

  try {
    compressionState.running = true;
    const result = await compressSessionHistory(sessionId.value, {
      keepRecent,
      maxSourceMessages: 24,
      maxEvents: 6,
    });

    if (result?.compressed) {
      await loadMemories();
      await loadMessages();
      return true;
    }
  } catch (error) {
    console.warn("[chat memory] failed to compress history", error);
  } finally {
    compressionState.running = false;
  }

  return false;
}

function scheduleHistoryCompression(delay = MEMORY_COMPRESSION_DELAY) {
  if (!sessionId.value) {
    return;
  }

  if (compressionState.timer) {
    clearTimeout(compressionState.timer);
  }

  compressionState.timer = setTimeout(async () => {
    compressionState.timer = null;
    await compressHistoryIfNeeded();
  }, delay);
}

async function loadSessionDetail(options) {
  sessionId.value = options.id || "";
  initialLoading.value = true;
  errorText.value = "";

  if (!sessionId.value) {
    errorText.value = "Missing session id";
    initialLoading.value = false;
    return;
  }

  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 0;

  try {
    const detail = await fetchSessionDetail(sessionId.value);
    pageTitle.value = options.title || detail.title || "Chat";
    botAvatar.value = options.avatar || detail.avatar || DEFAULT_BOT_AVATAR;
    sessionSystemText.value = detail.systemText || "";
    settingsForm.showPub = detail.showPub === "public" ? "public" : "private";
  } catch (error) {
    errorText.value = error?.message || "Failed to load session";
    pageTitle.value = options.title || "Chat";
    botAvatar.value = options.avatar || DEFAULT_BOT_AVATAR;
    sessionSystemText.value = "";
  }

  await loadMessages();
  await loadMemories();
  initialLoading.value = false;
  hasLoadedOnce.value = true;
  scheduleHistoryCompression(600);
}

async function handleSend() {
  const content = inputText.value.trim();
  const attachments = [...selectedAttachments.value];

  if ((!content && attachments.length === 0) || sending.value || !sessionId.value) {
    return;
  }

  errorText.value = "";
  sending.value = true;

  try {
    let streamingMessage = null;
    const { pendingMessage, reply } = await sendMessageWithContext({
      sessionId: sessionId.value,
      content,
      attachments,
      sessionSystemText: sessionSystemText.value,
      settings: settingsForm,
      memories: sessionMemories.value,
      fetchedModels: fetchedModels.value,
      apiKey: SILICONFLOW_API_KEY,
      apiUrl: SILICONFLOW_API_URL,
      currentMessages: messages.value,
      summaryText: contextSummary.value,
      onBeforeSend: async ({ userMessage, pendingMessage }) => {
        streamingMessage = pendingMessage;
        messages.value.push(userMessage, pendingMessage);
        inputText.value = "";
        selectedAttachments.value = [];
        await scrollToBottom();
      },
      onDelta: async (currentText) => {
        if (streamingMessage) {
          streamingMessage.content = currentText;
          await scrollToBottom();
        }
      },
    });

    pendingMessage.content = reply || "Empty reply";
    pendingMessage.status = "done";

    await persistConversation(sessionId.value, content, attachments, pendingMessage.content);
    contextSummary.value = buildConversationSummary(messages.value, settingsForm);
    scheduleHistoryCompression();
  } catch (error) {
    const pendingMessage = messages.value[messages.value.length - 1];
    if (pendingMessage?.role === "assistant" && !pendingMessage.content) {
      pendingMessage.content = "Request failed. Please try again later.";
      pendingMessage.status = "error";
    }

    errorText.value = error?.message || "Send failed";
  } finally {
    sending.value = false;
    await scrollToBottom();
  }
}

async function reloadSession() {
  if (!sessionId.value || sending.value) {
    return;
  }

  await loadSessionDetail({
    id: sessionId.value,
    title: pageTitle.value,
    avatar: botAvatar.value,
  });
}

function openModelSelector() {
  if (sending.value) {
    return;
  }
  fetchModels();
  settingsPopupRef.value?.open("center");
}

function closeSettings() {
  settingsPopupRef.value?.close();
}

function selectRecommendedModel(modelName) {
  settingsForm.modelName = modelName;
}

async function confirmSettings() {
  persistSettings();

  if (sessionId.value) {
    try {
      await updateSessionVisibility(sessionId.value, settingsForm.showPub);
    } catch (error) {
      console.warn("[chat session] failed to save visibility", error);
    }
  }

  if (currentUserId.value) {
    try {
      await saveSessionSettings(
        {
          modelName: settingsForm.modelName,
          temperature: Number(settingsForm.temperature),
          maxTokens: Number(settingsForm.maxTokens),
          maxMess: Number(settingsForm.maxMess),
          frequencyPenalty: Number(settingsForm.frequencyPenalty),
          repeat: Number(settingsForm.frequencyPenalty),
        },
        currentUserId.value
      );
    } catch (error) {
      console.warn("[chat settings] failed to save cloud settings", error);
    }
  }

  contextSummary.value = buildConversationSummary(messages.value, settingsForm);
  settingsPopupRef.value?.close();
  uni.showToast({
    title: "Settings saved",
    icon: "none",
  });
}

function goBack() {
  uni.navigateBack({
    delta: 1,
  });
}

onLoad(async (options) => {
  await loadSettings();
  fetchModels();
  await loadSessionDetail(options || {});
});

onShow(async () => {
  if (!hasLoadedOnce.value || sending.value || !sessionId.value) {
    return;
  }

  await loadMessages();
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

.nav-bar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 88rpx;
  padding-left: 24rpx;
  padding-right: 24rpx;
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid rgba(163, 196, 255, 0.2);
  backdrop-filter: blur(14rpx);
}

.nav-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn-placeholder {
  opacity: 0;
}

.nav-title {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 12rpx;
}

.title-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title-text {
  max-width: 420rpx;
  font-size: 32rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-text {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #7b8ec8;
}

.message-list {
  flex: 1;
  min-height: 0;
  height: 0;
  overflow: auto;
  box-sizing: border-box;
  padding: 28rpx 24rpx 12rpx;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.message-list :deep(::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
  background: transparent;
}

.message-list::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  background: transparent;
}

.page-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.empty-state {
  position: absolute;
  inset: 120rpx 0 140rpx;
  pointer-events: none;
}

.page-state-text {
  color: #7b8ec8;
  font-size: 28rpx;
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
  background: rgba(255, 255, 255, 0.88);
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
  box-shadow: 0 14rpx 36rpx rgba(124, 156, 219, 0.12);
}

.bubble.is-loading {
  min-height: 220rpx;
  display: flex;
  align-items: flex-start;
}

.bubble.is-loading .bubble-text {
  display: block;
  min-height: calc(1.6em * 4);
  width: 100%;
  padding-bottom: 72rpx;
}

.message-row.is-user .bubble {
  background: linear-gradient(135deg, #89c6ff 0%, #f7b0d8 100%);
  color: #fffdfd;
  border-color: rgba(255, 255, 255, 0.3);
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

.attachment-list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.attachment-card {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 12rpx;
  border-radius: 18rpx;
  background: rgba(246, 250, 255, 0.95);
  border: 1px solid rgba(186, 208, 255, 0.42);
}

.message-row.is-user .attachment-card {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.24);
}

.attachment-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.86);
}

.attachment-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.attachment-name,
.attachment-info {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-name {
  font-size: 24rpx;
  color: #41557f;
}

.message-row.is-user .attachment-name,
.message-row.is-user .attachment-info {
  color: #ffffff;
}

.attachment-info {
  font-size: 22rpx;
  color: #8b9bc4;
}

.message-status {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #7b8ec8;
}

.error-text {
  color: #d25d92;
}

.error-banner {
  flex-shrink: 0;
  position: relative;
  margin: 0 24rpx 16rpx;
  padding: 18rpx 54rpx 18rpx 20rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, rgba(255, 235, 244, 0.96), rgba(237, 246, 255, 0.96));
  color: #5e6e98;
  font-size: 24rpx;
  border: 1px solid rgba(187, 205, 255, 0.45);
  box-shadow: 0 10rpx 24rpx rgba(132, 157, 213, 0.12);
}

.error-banner-text {
  display: block;
  line-height: 1.5;
}

.error-close {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
}

.settings-form {
  width: 100%;
  text-align: left;
}

.settings-panel {
  width: min(88vw, 760rpx);
  max-width: 760rpx;
  min-width: 560rpx;
  height: auto;
  max-height: min(86vh, 1040rpx);
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  border-radius: 30rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f6fbff 100%);
  border: 1px solid rgba(186, 208, 255, 0.46);
  box-shadow: 0 24rpx 48rpx rgba(124, 156, 219, 0.18);
  overflow: hidden;
}

.settings-header {
  position: relative;
  flex-shrink: 0;
  padding: 30rpx 88rpx 22rpx 34rpx;
  border-bottom: 1px solid rgba(186, 208, 255, 0.18);
}

.settings-title {
  display: block;
  text-align: left;
  color: #3a4d78;
  font-size: clamp(28rpx, 3.8vw, 34rpx);
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.settings-close {
  position: absolute;
  top: 22rpx;
  right: 24rpx;
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(242, 247, 255, 0.96);
}

.settings-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-scroll {
  width: 100%;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  padding: 24rpx 34rpx 64rpx;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.settings-footer {
  flex-shrink: 0;
  display: flex;
  gap: 18rpx;
  padding: 18rpx 28rpx 24rpx;
  margin-top: 10rpx;
  border-top: 1px solid rgba(186, 208, 255, 0.18);
  background: rgba(255, 255, 255, 0.96);
}

.settings-cancel-btn,
.settings-confirm-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 22rpx;
  font-size: 30rpx;
  font-weight: 500;
  border: none;
}

.settings-cancel-btn {
  background: rgba(244, 247, 255, 1);
  color: #61739f;
  border: 1px solid rgba(186, 208, 255, 0.4);
}

.settings-confirm-btn {
  background: linear-gradient(135deg, #86c9ff 0%, #f6a8d6 100%);
  color: #ffffff;
  box-shadow: 0 12rpx 24rpx rgba(134, 188, 255, 0.2);
}

.recommended-models {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  align-items: stretch;
  justify-content: flex-start;
}

.recommended-chip {
  width: calc(50% - 7rpx);
  min-height: 72rpx;
  padding: 14rpx 18rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border-radius: 999rpx;
  background: rgba(239, 245, 255, 0.98);
  border: 1px solid rgba(174, 201, 255, 0.48);
  box-shadow: 0 8rpx 16rpx rgba(174, 201, 255, 0.1);
}

.recommended-chip.is-active {
  background: linear-gradient(135deg, #86c9ff 0%, #f6a8d6 100%);
  border-color: transparent;
}

.recommended-chip-text {
  color: #5a6fa8;
  font-size: 24rpx;
  width: 100%;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recommended-chip.is-active .recommended-chip-text {
  color: #ffffff;
}

.field-tip {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8b9bc4;
}

.settings-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  align-items: stretch;
  justify-content: flex-start;
}

.settings-chip {
  min-width: calc(50% - 7rpx);
  max-width: 100%;
  min-height: 72rpx;
  padding: 14rpx 18rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border-radius: 999rpx;
  background: rgba(244, 248, 255, 0.98);
  border: 1px solid rgba(174, 201, 255, 0.48);
  box-shadow: 0 8rpx 16rpx rgba(174, 201, 255, 0.08);
}

.settings-chip.is-active {
  background: linear-gradient(135deg, #86c9ff 0%, #f6a8d6 100%);
  border-color: transparent;
}

.settings-chip-text {
  width: 100%;
  text-align: left;
  color: #5a6fa8;
  font-size: 24rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.settings-chip.is-active .settings-chip-text {
  color: #ffffff;
}

.composer-attachments {
  flex-shrink: 0;
  padding: 0 24rpx 12rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.composer-attachment-card {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(186, 208, 255, 0.42);
  box-shadow: 0 8rpx 20rpx rgba(152, 184, 239, 0.08);
}

.composer-attachment-image {
  width: 92rpx;
  height: 92rpx;
  border-radius: 16rpx;
  background: rgba(244, 247, 255, 1);
}

.composer-attachment-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.composer-attachment-name,
.composer-attachment-info {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer-attachment-name {
  font-size: 26rpx;
  color: #41557f;
}

.composer-attachment-info {
  font-size: 22rpx;
  color: #8b9bc4;
}

.composer-attachment-remove {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(242, 247, 255, 0.96);
}

.input-bar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 16rpx;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  border-top: 1px solid rgba(191, 212, 255, 0.36);
  backdrop-filter: blur(18rpx);
}

.attach-btn {
  width: 84rpx;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(174, 201, 255, 0.5);
  box-shadow: 0 8rpx 20rpx rgba(152, 184, 239, 0.08);
}

.chat-input {
  flex: 1;
  min-height: 128rpx;
  max-height: 240rpx;
  height: 128rpx;
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(174, 201, 255, 0.5);
  font-size: 30rpx;
  line-height: 1.6;
  box-sizing: border-box;
  box-shadow: 0 8rpx 20rpx rgba(152, 184, 239, 0.1);
}

.input-actions {
  width: 180rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12rpx;
}

.send-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 20rpx;
  border: none;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #86c9ff 0%, #f6a8d6 100%);
  color: #ffffff;
  font-size: 28rpx;
  box-shadow: 0 10rpx 24rpx rgba(134, 188, 255, 0.24);
}

.send-btn[disabled] {
  opacity: 0.68;
}

.ghost-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 20rpx;
  border-radius: 24rpx;
  border: 1px solid rgba(174, 201, 255, 0.6);
  background: rgba(255, 255, 255, 0.9);
  color: #6b7ec0;
  font-size: 26rpx;
  box-shadow: 0 8rpx 18rpx rgba(174, 201, 255, 0.12);
}

.ghost-btn[disabled] {
  opacity: 0.65;
}

.bottom-anchor {
  height: 2rpx;
}

:deep(.uni-forms-item__label) {
  color: #5f74aa !important;
  font-size: 24rpx !important;
  line-height: 1.2 !important;
  padding-bottom: 12rpx !important;
  text-align: left !important;
}

:deep(.uni-forms-item) {
  margin-bottom: 22rpx !important;
  text-align: left !important;
}

:deep(.uni-data-select) {
  width: 100%;
  text-align: left !important;
}

:deep(.uni-select) {
  width: 100% !important;
  min-height: 84rpx !important;
  border-radius: 20rpx !important;
  border-color: rgba(186, 208, 255, 0.52) !important;
  background: rgba(255, 255, 255, 0.96) !important;
  text-align: left !important;
}

:deep(.uni-select__input-box) {
  height: 84rpx !important;
  justify-content: flex-start !important;
  text-align: left !important;
}

:deep(.uni-select__input-text) {
  max-width: calc(100% - 56rpx) !important;
  color: #41557f !important;
  font-size: 28rpx !important;
  text-align: left !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

:deep(.uni-select__selector-item) {
  text-align: left !important;
}

:deep(.uni-icons.uniui-clear) {
  color: #b9c3d7 !important;
}

@media screen and (max-width: 768px) {
  .settings-panel {
    width: calc(100vw - 40rpx);
    min-width: 0;
    max-height: calc(100vh - 48rpx);
  }

  .settings-header {
    padding: 28rpx 82rpx 20rpx 26rpx;
  }

  .settings-scroll {
    padding: 20rpx 24rpx 72rpx;
  }

  .recommended-chip {
    width: 100%;
  }

  .settings-chip {
    min-width: 100%;
  }

  .settings-footer {
    padding: 16rpx 20rpx 20rpx;
    margin-top: 12rpx;
  }
}
</style>

