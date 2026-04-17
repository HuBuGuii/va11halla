<template>
  <view class="index-page">
    <uni-section title="New Conversation" type="line">
      <button class="create-btn" @click="openTemplateDialog">Start New Chat</button>

      <uni-popup ref="dialogRef" type="dialog">
        <uni-popup-dialog type="info" title="Available AI Personas">
          <uni-list>
            <uni-list-chat
              v-for="item in featuredPersonas"
              :key="item.id"
              :title="item.title"
              :avatar="item.avatar"
              :note="item.desc"
              clickable
              @click="openWithPersona(item)"
            />

            <uni-list-item
              clickable
              title="Custom AI"
              note="Create a new persona template and start a private chat."
              @click="openDIYDialog"
            />

            <uni-list-item
              clickable
              title="Public Market"
              note="Browse all public persona templates."
              @click="openMarketDialog"
            />
          </uni-list>
        </uni-popup-dialog>
      </uni-popup>

      <uni-popup ref="diyRef" type="dialog">
        <view class="diy-panel">
          <uni-popup-dialog
            type="info"
            title="Create Persona Template"
            mode="base"
            :before-close="true"
            @close="closeDIYDialog"
            @confirm="confirmDIY"
          >
            <view class="diy-content">
              <view class="image-picker-wrap">
                <uni-file-picker
                  v-model="formData.imageFiles"
                  title="Set Avatar"
                  :limit="1"
                  file-mediatype="image"
                  @progress="onUploadProgress"
                  @success="onUploadSuccess"
                />
              </view>

              <uni-forms
                ref="formRef"
                :modelValue="formData"
                class="diy-form"
                label-width="100px"
                label-position="top"
                :rules="rules"
              >
                <uni-forms-item required label="Template Title" name="title">
                  <uni-easyinput
                    v-model="formData.title"
                    type="text"
                    placeholder="Enter template title"
                  />
                </uni-forms-item>

                <uni-forms-item required label="System Prompt" name="systemText">
                  <uni-easyinput
                    v-model="formData.systemText"
                    type="textarea"
                    :maxlength="-1"
                    placeholder="Define persona behavior here"
                  />
                </uni-forms-item>

                <uni-forms-item required label="Template Visibility" name="showPub">
                  <uni-data-checkbox
                    v-model="formData.showPub"
                    :localdata="showPubOptions"
                    mode="default"
                    selectedColor="#2979ff"
                  />
                </uni-forms-item>
              </uni-forms>
            </view>
          </uni-popup-dialog>
        </view>
      </uni-popup>

      <uni-popup ref="marketRef" type="dialog">
        <uni-popup-dialog type="info" title="Public Persona Market">
          <uni-list>
            <uni-list-chat
              v-for="item in marketPersonas"
              :key="item.id"
              :title="item.title"
              :avatar="item.avatar"
              :note="item.desc"
              clickable
              @click="openMarketPersona(item)"
            />
          </uni-list>
        </uni-popup-dialog>
      </uni-popup>
    </uni-section>

    <uni-section title="Session List" type="line">
      <view class="session-content">
        <view v-if="sessionList.length === 0" class="empty-state">
          <text class="empty-highlight">A!O!</text>
          <text>No chat history yet. Start with a new conversation above.</text>
        </view>

        <scroll-view v-else scroll-y class="session-scroll">
          <SessionListItem
            v-for="item in sessionList"
            :key="item.id"
            :title="item.title"
            :avatar="item.avatar"
            :show-pub="item.showPub"
            @click="openSession(item)"
          />
        </scroll-view>
      </view>
    </uni-section>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ComponentPublicInstance } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import SessionListItem from "../components/SessionListItem.vue";
import { getFriendSessions } from "../services/friendService";
import { getSessions } from "../services/sessionService";
import {
  clonePersonaToSession,
  createPersonaTemplate,
  getFeaturedPersonas,
  getPersonas,
} from "../services/personaService";

type UniPopupInstance = ComponentPublicInstance & {
  open: (type?: string) => void;
  close: () => void;
};

type FormRefInstance = ComponentPublicInstance & {
  validate: () => Promise<void>;
};

interface FileItem {
  url?: string;
}

interface FormInstance {
  title: string;
  systemText: string;
  showPub: "public" | "private";
  imageFiles: FileItem[];
}

interface SessionItemInstance {
  title: string;
  avatar: string;
  id: string;
  showPub: string;
  linkType?: "ai" | "friend";
  friend_user_id?: string;
}

interface PersonaItem {
  id: string;
  title: string;
  avatar: string;
  desc: string;
}

const FEATURED_PERSONA_TITLES = ["Jill", "Evil-Neuro"];

const dialogRef = ref<UniPopupInstance | null>(null);
const diyRef = ref<UniPopupInstance | null>(null);
const marketRef = ref<UniPopupInstance | null>(null);
const formRef = ref<FormRefInstance | null>(null);

const featuredPersonas = ref<PersonaItem[]>([]);
const marketPersonas = ref<PersonaItem[]>([]);
const sessionList = ref<SessionItemInstance[]>([]);

const showPubOptions = [
  { text: "Public", value: "public" },
  { text: "Private", value: "private" },
] as const;

const formData = ref<FormInstance>({
  title: "",
  systemText: "",
  showPub: "private",
  imageFiles: [],
});

const rules = {
  showPub: {
    rules: [{ required: true, errorMessage: "Select template visibility" }],
  },
  title: {
    rules: [{ required: true, errorMessage: "Enter template title" }],
  },
  systemText: {
    rules: [{ required: true, errorMessage: "Enter system prompt" }],
  },
};

function mapPersonaList(rows: any[] = []): PersonaItem[] {
  return rows.map((item) => ({
    id: String(item.id || ""),
    title: String(item.title || "Persona"),
    avatar: String(item.avatar || ""),
    desc: String(item.description || ""),
  }));
}

async function loadFeaturedPersonas() {
  featuredPersonas.value = await getFeaturedPersonas(FEATURED_PERSONA_TITLES);
}

async function loadMarketPersonas() {
  const rows = await getPersonas();
  marketPersonas.value = mapPersonaList(rows);
}

async function loadSessionList() {
  const [aiSessions, friendSessions] = await Promise.all([getSessions(), getFriendSessions()]);

  const normalizedFriends: SessionItemInstance[] = (friendSessions || []).map((item: any) => ({
    id: String(item.session_id || ""),
    title: String(item.friend_nickname || "Friend"),
    avatar: String(item.friend_avatar || ""),
    showPub: "friend",
    linkType: "friend",
    friend_user_id: String(item.friend_user_id || ""),
  }));

  const normalizedAi: SessionItemInstance[] = (aiSessions || []).map((item: any) => ({
    id: String(item.id || item._id || ""),
    title: String(item.title || "Chat"),
    avatar: String(item.avatar || ""),
    showPub: String(item.showPub || "private"),
    linkType: "ai",
  }));

  sessionList.value = [...normalizedFriends, ...normalizedAi];
}

async function openWithPersona(item: PersonaItem) {
  try {
    const created = await clonePersonaToSession(item.id, "private");
    const id = created?.id;
    if (!id) {
      throw new Error("Failed to create session");
    }

    uni.navigateTo({
      url: `/pages/chatBot/session/index?id=${encodeURIComponent(id)}&title=${encodeURIComponent(
        item.title
      )}&avatar=${encodeURIComponent(item.avatar)}`,
    });
  } catch (error) {
    showLoadError(error, "Failed to create session");
  }
}

function openSession(item: SessionItemInstance) {
  if (item.showPub === "friend" || item.linkType === "friend") {
    uni.navigateTo({
      url: `/pages/chatBot/friend/index?friend_session_id=${encodeURIComponent(
        item.id
      )}&friend_user_id=${encodeURIComponent(
        item.friend_user_id || ""
      )}&friend_name=${encodeURIComponent(item.title)}&friend_avatar=${encodeURIComponent(
        item.avatar || ""
      )}`,
    });
    return;
  }

  uni.navigateTo({
    url: `/pages/chatBot/session/index?id=${encodeURIComponent(item.id)}&title=${encodeURIComponent(
      item.title
    )}&avatar=${encodeURIComponent(item.avatar || "")}`,
  });
}

async function openMarketPersona(item: PersonaItem) {
  await openWithPersona(item);
  marketRef.value?.close();
}

function resetDIYForm() {
  formData.value = {
    title: "",
    systemText: "",
    showPub: "private",
    imageFiles: [],
  };
}

function openTemplateDialog() {
  dialogRef.value?.open("center");
}

function openDIYDialog() {
  dialogRef.value?.close();
  if (!formData.value.showPub) {
    formData.value.showPub = "private";
  }
  diyRef.value?.open("center");
}

function closeDIYDialog() {
  diyRef.value?.close();
}

async function openMarketDialog() {
  try {
    dialogRef.value?.close();
    await loadMarketPersonas();
    marketRef.value?.open("center");
  } catch (error) {
    showLoadError(error, "Failed to load market");
  }
}

function onUploadProgress(event: unknown) {
  console.log("[persona upload] progress", event);
}

function onUploadSuccess() {
  console.log("[persona upload] success");
}

async function confirmDIY() {
  try {
    await formRef.value?.validate();

    const avatar = formData.value.imageFiles[0]?.url || "";
    const persona = await createPersonaTemplate({
      title: formData.value.title,
      systemText: formData.value.systemText,
      showPub: formData.value.showPub,
      avatar,
      tags: [],
    });

    const created = await clonePersonaToSession(String(persona?.id || ""), "private");
    const createdId = created?.id;
    if (!createdId) {
      throw new Error("Failed to create new session");
    }

    uni.showToast({
      title: "Template created",
      icon: "success",
    });

    const title = formData.value.title;
    resetDIYForm();
    diyRef.value?.close();

    await loadSessionList();

    uni.navigateTo({
      url: `/pages/chatBot/session/index?id=${encodeURIComponent(
        createdId
      )}&title=${encodeURIComponent(title)}&avatar=${encodeURIComponent(avatar)}`,
    });
  } catch (error) {
    showLoadError(error, "Failed to create template");
  }
}

function showLoadError(error: unknown, fallback = "Load failed") {
  const message = (error as Error)?.message || fallback;
  uni.showToast({
    title: message,
    icon: "none",
  });
}

onLoad(async () => {
  try {
    await loadFeaturedPersonas();
    await loadSessionList();
  } catch (error) {
    showLoadError(error, "Initialization failed");
  }
});

onShow(async () => {
  try {
    await loadSessionList();
  } catch (error) {
    showLoadError(error, "Failed to refresh sessions");
  }
});
</script>

<style scoped lang="scss">
.index-page {
  min-height: 100vh;
  padding: 20px;
  background-color: #f8f8fb;
  color: #333;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}

.create-btn {
  width: 80%;
  margin: 20px auto;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  color: #2c2c2c;
  background: linear-gradient(to right, #c3d9ff, #e2d3ff);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.create-btn:hover {
  opacity: 0.95;
  transform: scale(1.02);
}

.session-content {
  display: flex;
  flex-direction: column;
}

.session-scroll {
  max-height: 650rpx;
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  padding: 8rpx 20rpx;
  font-size: 16px;
  line-height: 1.6;
  color: #4a4a4a;
}

.empty-highlight {
  display: inline-block;
  margin-right: 10rpx;
  font-weight: 700;
  color: #7f5fff;
}

.diy-content {
  width: 95%;
  padding: 10px 0;
}

.image-picker-wrap {
  margin-bottom: 15rpx;
}

:deep(.uni-popup-dialog) {
  min-width: 320px;
  width: 80vw;
  max-width: 650px;
  overflow: hidden;
  border: 1px solid #dcdcdc;
  border-radius: 12px;
  background-color: #ffffff;
  color: #333;
}

:deep(.uni-popup-dialog .uni-list),
:deep(.uni-popup-dialog .uni-list-item),
:deep(.uni-popup-dialog .uni-list-chat),
:deep(.uni-popup-dialog .uni-list-item__container),
:deep(.uni-popup-dialog .uni-list-chat__container) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

:deep(.uni-popup-dialog .uni-list) {
  overflow: hidden;
}

:deep(.uni-list-chat__content) {
  min-width: 0;
  overflow: hidden;
}

:deep(.uni-list-chat__content-title) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.uni-list-chat__content-note) {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.uni-section) {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 10px;
  border-left: 6px solid #7f5fff;
  background-color: #fff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
}

:deep(.uni-section__title) {
  font-size: 18px;
  font-weight: 700;
  color: #5e5eac !important;
}
</style>
