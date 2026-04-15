<template>
  <view class="index">
    <uni-section title="新建对话" type="line">
      <button class="button" @click="initSession">点我呀</button>

      <uni-popup ref="dialogRef" type="dialog">
        <uni-popup-dialog type="info" title="可用 AI 列表">
          <uni-list>
            <uni-list-chat
              v-for="item in chatList"
              :key="item.id"
              :title="item.title"
              :avatar="item.avatar"
              :note="item.desc"
              clickable
              @click="openSession(item)"
            />

            <uni-list-item
              clickable
              @click="DIYchat"
              title="自定义 AI"
              note="创建角色模板并立即开始一个新的私有对话"
            />

            <uni-list-item
              clickable
              @click="chatMarket"
              title="公开市场"
              note="查看所有公开的 AI"
            />
          </uni-list>
        </uni-popup-dialog>
      </uni-popup>

      <uni-popup ref="diyRef" type="dialog">
        <view class="dialogInside1">
          <uni-popup-dialog
            type="info"
            title="创建角色模板"
            mode="base"
            @close="closeDIY"
            @confirm="confirmDIY"
            :before-close="true"
          >
            <view class="diyInside2">
              <view class="image">
                <uni-file-picker
                  v-model="formData.imageFiles"
                  title="设置头像"
                  :limit="1"
                  file-mediatype="image"
                  @progress="progress"
                  @success="success"
                />
              </view>

              <uni-forms
                ref="formRef"
                :modelValue="formData"
                class="formClass"
                label-width="100px"
                label-position="top"
                :rules="rules"
              >
                <uni-forms-item required label="设置标题" name="title">
                  <uni-easyinput
                    v-model="formData.title"
                    type="text"
                    placeholder="输入角色模板标题"
                  />
                </uni-forms-item>

                <uni-forms-item required label="设置提示词" name="systemText">
                  <uni-easyinput
                    v-model="formData.systemText"
                    type="textarea"
                    :maxlength="-1"
                    placeholder="用于定义角色模板的系统提示词"
                  />
                </uni-forms-item>

                <uni-forms-item required label="模板公开性" name="showPub">
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
        <uni-popup-dialog type="info" title="公开市场">
          <uni-list>
            <uni-list-chat
              v-for="item in marketList"
              :key="item.id"
              :title="item.title"
              :avatar="item.avatar"
              :note="item.desc"
              clickable
              @click="openMarketSession(item)"
            />
          </uni-list>
        </uni-popup-dialog>
      </uni-popup>
    </uni-section>

    <uni-section title="对话列表" type="line">
      <view class="content">
        <view class="text" v-if="list.length === 0">
          <text class="highlight">A!O!</text>
          <text>你还没有和任何 AI 聊过天，点击新建试试。</text>
        </view>

        <scroll-view v-else scroll-y class="list-scroll">
          <uni-list>
            <uni-list-item
              v-for="item in list"
              :key="item.id"
              :title="item.title"
              :thumb="item.avatar"
              thumb-size="lg"
              :rightText="item.showPub"
              clickable
              @click="continueSession(item)"
            />
          </uni-list>
        </scroll-view>
      </view>
    </uni-section>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ComponentPublicInstance } from "vue";
import { onLoad } from "@dcloudio/uni-app";

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
  showPub: string;
  imageFiles: FileItem[];
}

interface ListInstance {
  title: string;
  avatar: string;
  id: string;
  showPub: string;
}

interface TemplateChatItem {
  id: string;
  title: string;
  avatar: string;
  desc: string;
}

const dialogRef = ref<UniPopupInstance | null>(null);
const diyRef = ref<UniPopupInstance | null>(null);
const marketRef = ref<UniPopupInstance | null>(null);
const formRef = ref<FormRefInstance | null>(null);
const list = ref<ListInstance[]>([]);
const chatHelper = uniCloud.importObject("chatHelper");

const showPubOptions = [
  { text: "公开", value: "public" },
  { text: "私人", value: "private" },
];

const FEATURED_PERSONA_TITLES = ["Jill", "Evil-Neuro"];

const chatList = ref<TemplateChatItem[]>([]);
const marketList = ref<TemplateChatItem[]>([]);

const formData = ref<FormInstance>({
  title: "",
  systemText: "",
  showPub: "private",
  imageFiles: [],
});

const rules = {
  showPub: {
    rules: [{ required: true, errorMessage: "必须确认模板是否公开" }],
  },
  title: {
    rules: [{ required: true, errorMessage: "必须填写标题" }],
  },
  systemText: {
    rules: [{ required: true, errorMessage: "必须填写提示词" }],
  },
};

const getSessions = async () => {
  const info = uniCloud.getCurrentUserInfo();
  const uid = info.uid;
  return await chatHelper.getSessions(uid);
};

const getFeaturedPersonas = async () => {
  const res = await chatHelper.getPersonas({ includePrivate: true });
  const personaMap = new Map(
    (res?.personas || []).map((item) => [String(item.title || ""), item])
  );

  chatList.value = FEATURED_PERSONA_TITLES.map((title) => {
    const item = personaMap.get(title);
    if (!item) {
      return null;
    }

    return {
      id: String(item.id),
      title: String(item.title || title),
      avatar: String(item.avatar || ""),
      desc: String(item.description || ""),
    };
  }).filter(Boolean) as TemplateChatItem[];
};

const getMarketPersonas = async () => {
  const res = await chatHelper.getPersonas();
  marketList.value = (res?.personas || []).map((item) => ({
    id: String(item.id),
    title: String(item.title || "Persona"),
    avatar: String(item.avatar || ""),
    desc: String(item.description || ""),
  }));
};

const openSession = async (item: TemplateChatItem) => {
  const created = await chatHelper.clonePersonaToSession(item.id, "private");
  const id = created?.id;
  uni.navigateTo({
    url: `/pages/chatBot/session/index?id=${id}&title=${encodeURIComponent(
      item.title
    )}&avatar=${encodeURIComponent(item.avatar)}`,
  });
};

const continueSession = (item: ListInstance) => {
  uni.navigateTo({
    url: `/pages/chatBot/session/index?id=${item.id}&title=${encodeURIComponent(
      item.title
    )}&avatar=${encodeURIComponent(item.avatar)}`,
  });
};

const openMarketSession = async (item: TemplateChatItem) => {
  const created = await chatHelper.clonePersonaToSession(item.id, "private");
  const id = created?.id;
  marketRef.value?.close();
  uni.navigateTo({
    url: `/pages/chatBot/session/index?id=${id}&title=${encodeURIComponent(
      item.title
    )}&avatar=${encodeURIComponent(item.avatar)}`,
  });
};

const progress = (e: unknown) => {
  console.log("上传进度", e);
};

const success = () => {
  console.log("上传成功");
};

const initSession = () => {
  dialogRef.value?.open("center");
};

const DIYchat = () => {
  dialogRef.value?.close();
  if (!formData.value.showPub) {
    formData.value.showPub = "private";
  }
  diyRef.value?.open("center");
};

const chatMarket = () => {
  dialogRef.value?.close();
  getMarketPersonas().then(() => {
    marketRef.value?.open("center");
  });
};

const cleanForm = () => {
  formData.value = {
    title: "",
    systemText: "",
    showPub: "private",
    imageFiles: [],
  };
};

const confirmDIY = async () => {
  await formRef.value?.validate();

  const avatar = formData.value.imageFiles[0]?.url || "";
  const persona = await chatHelper.createPersona({
    title: formData.value.title,
    description: formData.value.systemText.slice(0, 60),
    systemText: formData.value.systemText,
    showPub: formData.value.showPub,
    avatar,
    tags: [],
  });

  const created = await chatHelper.clonePersonaToSession(persona.id, "private");

  uni.showToast({
    title: "模板已创建",
    icon: "success",
  });

  const createdId = created?.id;
  const title = formData.value.title;

  cleanForm();
  diyRef.value?.close();

  list.value = await getSessions();

  if (createdId) {
    uni.navigateTo({
      url: `/pages/chatBot/session/index?id=${createdId}&title=${encodeURIComponent(
        title
      )}&avatar=${encodeURIComponent(avatar)}`,
    });
  }
};

const closeDIY = () => {
  diyRef.value?.close();
};

onLoad(async () => {
  await getFeaturedPersonas();
  list.value = await getSessions();
});
</script>

<style scoped lang="scss">
:deep(.uni-popup-dialog) {
  min-width: 320px;
  width: 80vw;
  max-width: 650px;
  overflow: hidden;
  background-color: #ffffff;
  border: 1px solid #dcdcdc;
  border-radius: 12px;
  color: #333;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
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

.diyInside2 {
  width: 95%;
  padding: 10px 0;
}

.image {
  margin-bottom: 15rpx;
}

.button {
  width: 80%;
  background: linear-gradient(to right, #c3d9ff, #e2d3ff);
  border: none;
  color: #2c2c2c;
  padding: 12px;
  border-radius: 12px;
  text-align: center;
  margin: 20px auto;
  font-weight: bold;
  font-size: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}

.button:hover {
  opacity: 0.95;
  transform: scale(1.02);
}

.index {
  background-color: #f8f8fb;
  min-height: 100vh;
  padding: 20px;
  color: #333;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}

.text {
  padding-left: 20rpx;
  font-size: 16px;
  line-height: 1.6;
  color: #4a4a4a;
}

.text .highlight {
  display: inline-block;
  color: #7f5fff;
  font-weight: bold;
}

.uni-section {
  margin-bottom: 24px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
  padding: 16px;
  border-left: 6px solid #7f5fff;
}

.uni-section__title {
  color: #5e5eac !important;
  font-weight: bold;
  font-size: 18px;
}

.uni-easyinput__content,
.uni-data-checklist {
  padding-left: 20rpx;
  color: #333 !important;
}

.uni-list-item__title {
  color: #5e5eac !important;
  font-weight: bold;
}

.content {
  display: flex;
  flex-direction: column;

  .list-scroll {
    max-height: 650rpx;
    flex: 1;
    overflow-y: auto;
  }
}
</style>
