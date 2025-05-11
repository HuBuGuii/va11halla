<template>
  <view class="index">
    <uni-section title="新建对话" type="line">
      <button class="button" @click="initSession">click to init</button>
      <uni-popup ref="dialogRef" type="dialog">
        <uni-popup-dialog type="info" title="可用ai列表">
          <uni-list>
            <uni-list-item title="1hao" note="fdsakj"> oye </uni-list-item>
            <uni-list-item title="2hao" note="skldjfl"> </uni-list-item>
            <uni-list-item
              clickable
              @click="DIYchat"
              title="自定义ai"
              note="可以选择自己设置提示词，头像等功能，也可以选择上传至服务器供他人参考"
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
                <uni-forms-item label="设置标题" name="title">
                  <uni-easyinput v-model="formData.title" type="text" />
                </uni-forms-item>
                <uni-forms-item label="设置提示词" name="systemText">
                  <uni-easyinput
                    v-model="formData.systemText"
                    type="textarea"
                    placeholder="可选不填，但使用过程中不能再次设置"
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
      <view class="content" v-if="!existList">
        <text class="text">A!O!你还没有和任何ai聊过天呢,点击新建试试</text>
      </view>
      <uni-list v-if="existList">
        <uni-list-item v-for="item in list" title="item.title" note="">
        </uni-list-item>
      </uni-list>
    </uni-section>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ComponentPublicInstance } from "vue";

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

const existList = ref(false);
const dialogRef = ref<UniPopupInstance | null>(null);
const diyRef = ref<UniPopupInstance | null>(null);
const formRef = ref<FormRefInstance | null>(null);
const list = ref([]);
const chatHelper = uniCloud.importObject("chatHelper");

const showPubOptions = [
  { text: "公开", value: "public" },
  { text: "私人", value: "private" },
];

const formData = ref<FormInstance>({
  title: "",
  systemText: "",
  showPub: "",
  imageFiles: [] as any[],
});

const rules = {
  showPub: {
    rules: [{ required: true, errorMessage: "必须确认私人或公开" }],
  },
};

const progress = (e) => {
  console.log("上传进度", e);
};
const success = (e) => {
  console.log("上传成功");
};

const initSession = () => {
  console.log("init");
  dialogRef.value?.open("center");
};
const DIYchat = () => {
  dialogRef.value?.close();
  diyRef.value?.open("center");
};



const alert = (text, image) => {
  if (!text && image.length === 0) {
    uni.showToast({
      title: "未设置头像和提示词，都将使用默认",
      icon: "none",
      mask: true,
      position: top,
    });
    return;
  }
  if (!text) {
    uni.showToast({
      title: "未设置提示词，将使用默认模板",
      icon: "none",
      mask: true,
    });
    return;
  }
  if (image.length === 0) {
    uni.showToast({
      title: "未设置头像，将使用默认头像",
      icon: "none",
      mask: true,
    });
  }
};

const confirmDIY = async () => {
  await formRef.value?.validate();
  console.log(formData.value.imageFiles)

  await chatHelper.createSession(
    formData.value.title,
    formData.value.systemText,
    formData.value.showPub,
    formData.value.imageFiles[0].url
  );

  await alert(formData.value.systemText,formData.value.imageFiles)

  // 提示成功并关闭弹窗
  uni.showToast({
    title: "创建成功",
    icon: "success",
  });
  diyRef.value?.close();
};

const closeDIY = () => {
  console.log("close");
  diyRef.value?.close();
};
</script>

<style scoped lang="scss">
:deep(.uni-popup-dialog) {
  min-width: 350px;
  width: 80vw;
}
.diyInside2 {
  width: 95%;
}
.image {
  margin-bottom: 15rpx;
}
</style>
