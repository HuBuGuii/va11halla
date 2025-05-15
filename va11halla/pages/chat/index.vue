<template>
  <view class="index">
    <uni-section title="新建对话" type="line">
      <button class="button" @click="initSession">点我叭</button>
      <uni-popup ref="dialogRef" type="dialog">
        <uni-popup-dialog type="info" title="可用ai列表">
          <uni-list>
            <uni-list-chat
              v-for="item in chatList"
              :key="item.id"
              :title="item.title"
              :avatar="item.avatar"
              :note="item.desc"
              clickable
              @click="openSession(item)"
            >
            </uni-list-chat>
            <uni-list-item
              clickable
              @click="DIYchat"
              title="自定义ai"
              note="可以选择自己设置提示词，头像等功能，也可以选择上传至服务器供他人参考"
            >
            </uni-list-item>
            <uni-list-item
              clickable
              @click="chatMarket"
              title="公开市场"
              note="查看所有公开的ai"
            >
            </uni-list-item>
          </uni-list>
        </uni-popup-dialog>
      </uni-popup>
      <uni-popup ref="diyRef" type="dialog">
        <view class="dialogInside1">
          <uni-popup-dialog
            type="info"
            title="认真DIY中"
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
                  <uni-easyinput v-model="formData.title" type="text" />
                </uni-forms-item>
                <uni-forms-item required label="设置提示词" name="systemText">
                  <uni-easyinput
                    v-model="formData.systemText"
                    type="textarea"
                    :maxlength="-1"
                    placeholder="使用过程中不能重复设置"
                  />
                </uni-forms-item>
                <uni-forms-item required label="设置私密性" name="showPub">
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
    </uni-section>
    <uni-section title="对话列表" type="line">
      <view class="content">
        <view class="text" v-if="list.length === 0"
          ><text class="highlight">A!O!</text
          ><text>你还没有和任何ai聊过天呢,点击新建试试</text>
        </view>
        <scroll-view v-else scroll-y class="list-scroll">
          <uni-list >
            <uni-list-chat
              v-for="item in list"
              :key="item.id"
              :title="item.title"
              :avatar="item.avatar"
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
import { nextTick, ref } from "vue";
import type { ComponentPublicInstance } from "vue";
import { onLoad } from "@dcloudio/uni-app";

type UniPopupInstance = ComponentPublicInstance & {
  open: (type?: string) => void;
  close: () => void;
};
type FormRefInstance = ComponentPublicInstance & {
  validate: () => Promise<void>;
};
interface FormInstance {
  title: string;
  systemText: string;
  showPub: string;
  imageFiles: [];
}

interface listInstance {
  title: string;
  avatar: string;
  id: string;
}

const dialogRef = ref<UniPopupInstance | null>(null);
const diyRef = ref<UniPopupInstance | null>(null);
const formRef = ref<FormRefInstance | null>(null);
const list = ref<listInstance[]>([]);
const chatHelper = uniCloud.importObject("chatHelper");

const showPubOptions = [
  { text: "公开", value: "public" },
  { text: "私人", value: "private" },
];

const chatList = ref([
  {
    id: 1,
    title: "Jill",
    avatar:
      "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/9696dbcc-65c7-4b17-9d05-d81928976694.png",
    desc: "调制饮品，改变人生",
  },
  {
    id: 2,
    title: "Evil-Neuro",
    avatar:
      "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/97b55ac5-2a9a-49e6-bd56-5cf756ec147e.png",
    desc: "Abber Demon!",
  },
]);

const formData = ref<FormInstance>({
  title: "",
  systemText: "",
  showPub: "",
  imageFiles: [],
});

const rules = {
  showPub: {
    rules: [{ required: true, errorMessage: "必须确认私人或公开" }],
  },
  title: {
    rules: [{ required: true, errorMessage: "必须确认标题" }],
  },
  systemText: {
    rules: [{ required: true, errorMessage: "必须确认设定词" }],
  },
};

const getSessions = async () => {
  const info = uniCloud.getCurrentUserInfo();
  const uid = info.uid;
  console.log(uid);
  const reply = await chatHelper.getSessions(uid);
  return reply;
};

const openSession = (item) => {
  let id = ''
  let title = item.title
  let avatar = item.avatar
  if (item.id === 1) {
     id = chatHelper.copySession("68208911652341756270645a");
  }
  if (item.id === 2) {
     id = chatHelper.copySession("68219010b9fb230b03d63ced");
  }
  uni.navigateTo({ url: `/pages/chat/deepseek?id=${id}&title=${title}&avatar=${avatar}` })
};

const continueSession = (item) => {
  let id = item.id
  let title = item.title
  let avatar = item.avatar
  uni.navigateTo({ url: `/pages/chat/deepseek?id=${id}&title=${title}&avatar=${avatar}` })
}

const progress = (e) => {
  console.log("上传进度", e);
};
const success = (e) => {
  console.log("上传成功");
};

const initSession = () => {
  dialogRef.value?.open("center");
};
const DIYchat = () => {
  dialogRef.value?.close();
  diyRef.value?.open("center");
};
const chatMarket = () => {
  console.log("chatmarket");
};

const cleanForm = () => {
  formData.value = {
    title: "",
    systemText: "",
    showPub: "",
    imageFiles: [],
  };
};

const confirmDIY = async () => {
  await formRef.value?.validate();
  console.log(formData.value.imageFiles);

  await chatHelper.createSession(
    formData.value.title,
    formData.value.systemText,
    formData.value.showPub,
    formData.value.imageFiles[0].url
  );

  // 提示成功并关闭弹窗
  uni.showToast({
    title: "创建成功",
    icon: "success",
  });

  cleanForm();
  diyRef.value?.close();
};

const closeDIY = () => {
  console.log("close");
  diyRef.value?.close();
};

onLoad(async (options) => {
  const res = await getSessions();
  list.value = res;
  console.log(list.value)
});
</script>

<style scoped lang="scss">
:deep(.uni-popup-dialog) {
  min-width: 320px;
  width: 80vw;
  max-width: 650px;
  background-color: #ffffff;
  border: 1px solid #dcdcdc;
  border-radius: 12px;
  color: #333;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
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
.content{
  display: flex;
  flex-direction: column;
  .list-scroll{
    max-height: 650rpx;
    flex:1;
    overflow-y: auto;
  }
}
</style>
