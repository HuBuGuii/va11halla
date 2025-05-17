<template>
  <view class="chat-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <uni-icons type="left" size="24" color="#333"></uni-icons>
      </view>
      <text class="title"><text class="now">当前聊天： </text>{{ title }}</text>
      <view class="setting-btn" @click="openSettings">
        <uni-icons type="settings" size="24" color="#333" />
      </view>
    </view>
    <!-- 消息列表区域 -->
    <scroll-view scroll-y class="message-list" :scroll-top="scrollTop">
      <view
        v-for="(msg, index) in messages"
        :key="index"
        class="message-item"
        :class="msg.role === 'user' ? 'user' : 'assistant'"
      >
        <image
          class="avatar"
          :src="msg.role === 'user' ? userAvatar : botAvatar"
        />
        <view class="bubble">
          {{ msg.content }}
        </view>
      </view>
    </scroll-view>

    <!-- 输入区域 -->
    <view class="input-area">
      <input
        v-model="inputText"
        class="input"
        placeholder="请输入你的问题..."
        :focus="inputFocused"
        @confirm="sendMessage"
      />
      <button class="send-btn" @click="sendMessage">发送</button>
    </view>

    <view class="settings">
      <uni-popup ref="settingRef" type="dialog">
        <view class="insideSetting">
          <uni-popup-dialog
            type="info"
            title="设置"
            mode="base"
            @close="closeSetting"
            @confirm="confirmSetting"
            :before-close="true"
          >
            <uni-forms
              ref="formRef"
              :modelValue="formData"
              class="formClass"
              label-width="100px"
              label-position="top"
              :rules="rules"
            >
              <uni-forms-item required label="模型选择" name="modelName">
                <uni-data-select
                  v-model="formData.modelName"
                  :localdata="selectModel"
                  mode="picker"
                  clear
                  selectedColor="#7f5fff"
                  placeholder="请选择你的模型"
                />
              </uni-forms-item>
              <uni-forms-item required label="随机性" name="temperature">
                <uni-data-select
                  v-model="formData.temperature"
                  :localdata="selectTemperature"
                  mode="picker"
                  clear
                  selectedColor="#7f5fff"
                  placeholder="请选择输出的随机性"
                />
              </uni-forms-item>
              <uni-forms-item required label="最大输出长度" name="maxTokens">
                <uni-data-select
                  v-model="formData.maxTokens"
                  :localdata="selectMaxtokens"
                  mode="picker"
                  clear
                  selectedColor="#7f5fff"
                  placeholder="输出越长，等待时间也越长哦"
                />
              </uni-forms-item>
              <uni-forms-item required label="重复内容" name="repeatMes">
                <uni-data-select
                  v-model="formData.repeat"
                  :localdata="selectRepeat"
                  mode="picker"
                  clear
                  selectedColor="#7f5fff"
                  placeholder="请选择重复内容长度"
                />
              </uni-forms-item>
              <uni-forms-item required label="最长上下文" name="maxMess">
                <uni-data-select
                  v-model="formData.maxMess"
                  :localdata="selectMaxMess"
                  mode="picker"
                  clear
                  selectedColor="#7f5fff"
                  placeholder="请选择上传的最长上下文"
                />
              </uni-forms-item>
            </uni-forms>
          </uni-popup-dialog>
        </view>
      </uni-popup>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";

interface message {
  role: string;
  content: string;
}

interface formInstance {
  modelName: string;
  temperature: number;
  maxTokens: number;
  repeat: number;
  maxMess: number;
}

const inputText = ref("");
const uid = ref();
const messages = ref<message[]>([]);
const scrollTop = ref(0);
const prompt = ref("");
const userAvatar = ref(
  "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/%23TimBeta.jpg"
); // 用户头像
const botAvatar = ref("");
const inputFocused = ref(true);
const chatHelper = uniCloud.importObject("chatHelper");
const session_id = ref("");
const title = ref("");
const limit = ref(15)
const settingRef = ref();
const formRef = ref();
const formData = ref<formInstance>({
  modelName: "deepseek-ai/DeepSeek-V3",
  temperature: 0.7,
  maxTokens: 256,
  repeat: 0.7,
  maxMess: 15,
});

const rules = {
  modelName: {
    rules: [{ required: true, errorMessage: "请选择模型" }],
  },
  temperature: {
    rules: [{ required: true, errorMessage: "请选择随机性" }],
  },
  maxTokens: {
    rules: [{ required: true, errorMessage: "请选择最大输出长度" }],
  },
  repeat: {
    rules: [{ required: true, errorMessage: "请选择重复内容长度" }],
  },
  maxMess: {
    rules: [{ required: true, errorMessage: "请选择最长上下文" }],
  },
};

const selectModel = [
  { text: "V3 (默认模型)", value: "deepseek-ai/DeepSeek-V3" },
  { text: "R1 (耗费更大)", value: "deepseek-ai/DeepSeek-R1" },
];

const selectTemperature = [
  { text: "很随机", value: 0.9 },
  { text: "很中立", value: 0.7 },
  { text: "很保守", value: 0.5 },
];

const selectMaxtokens = [
  { text: "比较短", value: 256 },
  { text: "正常值", value: 512 },
  { text: "非常长", value: 2048 },
];

const selectRepeat = [
  { text: "较少重复（创造）", value: 0.9 },
  { text: "正常值", value: 0.7 },
  { text: "较多重复（保守）", value: 0.4 },
];

const selectMaxMess = [
  { text: "15条", value: 15 },
  { text: "30条", value: 30 },
  { text: "无限条(不推荐)", value: -1 },
];

onLoad(async (options) => {
  title.value = options.title || "聊天";
  session_id.value = options.id;
  botAvatar.value = options.avatar;
  const info = uniCloud.getCurrentUserInfo();
  uid.value = info.uid;

  prompt.value = await chatHelper.getPrompt(session_id.value);
  const set = await chatHelper.getSettings(uid.value);
  let res = await chatHelper.getMessages({session_id:session_id.value,limit:limit.value})
  messages.value = res.messages
  const filteredData = set.map(({ _id, user_id, ...rest }) => rest);
  formData.value = {
    modelName: filteredData?.[0]?.modelName || "deepseek-ai/DeepSeek-V3",
    temperature: filteredData?.[0]?.temperature || 0.7,
    maxTokens: filteredData?.[0]?.maxTokens || 256,
    repeat: filteredData?.[0]?.repeat || 0.7,
    maxMess:filteredData?.[0]?.maxMess || 15
  };
  console.log(formData.value)
});

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    scrollTop.value = Math.random() * 1000000;
  });
};

const closeSetting = () => {
  settingRef.value?.close();
};

const confirmSetting = () => {
  chatHelper.saveSettings(formData.value, uid.value);
  settingRef.value?.close();
};

const openSettings = () => {
  settingRef.value?.open("center");
  console.log(formData.value);
};

const sendMessage = async () => {
  const text = inputText.value.trim();
  if (!text) return;

  inputFocused.value = false;
  // 添加用户消息
  messages.value.push({ role: "user", content: text });
  inputText.value = "";
  chatHelper.saveMessage({ session_id:session_id.value, role: "user", content: text });
  scrollToBottom();

  // 添加机器人“思考中”
  messages.value.push({ role: "assistant", content: "正在思考中...请耐心等待" });
  scrollToBottom();

  // 模拟接口回复
  const reply = await sendMessageToGPT(messages.value);
  messages.value[messages.value.length - 1] = {
    role: "assistant",
    content: reply,
  };
  chatHelper.saveMessage({ session_id:session_id.value, role: "assistant", content: reply });
  scrollToBottom();

  nextTick(() => {
    inputFocused.value = true;
  });
};

const sendMessageToGPT = async (messages: any[]) => {
  let sendMes = [] as message[];
  const max = formData.value.maxMess;
  const transformedMessages = messages
  .filter((m) => !(m.role === "assistant" && m.content === "正在思考中...请耐心等待")) 
  .map((m) => ({
    role: m.role,
    content:
      typeof m.content === "object" && m.content.value !== undefined
        ? m.content.value
        : m.content,
  }));

  if (max === -1) {
    sendMes = [
      { role: "system", content: prompt.value },
      ...transformedMessages,
    ];
  } else {
    sendMes = [
      { role: "system", content: prompt.value },
      ...transformedMessages.slice(-max),
    ];
  }
  console.log(sendMes);
  console.log(formData.value.modelName)
  const sendRequest = {
      url: "https://api.siliconflow.cn/v1/chat/completions",
      method: "POST",
      header: {
        Authorization:
          "Bearer sk-lgquhuftllbtjnwauywqnmwujsowlkrlddgyovlevkbmnxxj",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: {
        model: formData.value.modelName,
        messages: sendMes,
        stream: false,
        max_tokens: formData.value.maxTokens,
        temperature: formData.value.temperature,
        top_p: 0.9,
        top_k: 50,
        frequency_penalty: formData.value.repeat,
        n: 1,
        response_format: {
          type: "text",
        },
      },
    }
    

  try {
    const res = await uni.request(sendRequest);

    const reply = res.data?.choices?.[0]?.message?.content || "AI 无回复";
    return reply;
  } catch (err) {
    console.error("[请求失败]", err);
    return "请求失败，请稍后再试";
  }
};

const goBack = () => {
  uni.navigateBack({ delta: 1 });
};
</script>

<style scoped lang="scss">
$milky-white: #f8f4ff;
$soft-blue: #d6e4ff;
$lavender: #e8d7ff;
$dreamy-purple: #c19eff;
$pink-accent: #ffd6e7;
$text-dark: #5a4b6d;

page {
  height: 100vh;
  background-color: $milky-white;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}

.chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(
    180deg,
    $milky-white 0%,
    rgba($lavender, 0.1) 100%
  );
  overflow: hidden;

  .nav-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 88rpx;
    padding: 0 32rpx;
    background-color: rgba($milky-white, 0.9);
    border-bottom: 2rpx solid rgba($lavender, 0.3);
    backdrop-filter: blur(10rpx);
    flex-shrink: 0;

    .title {
      font-size: larger;
      color: $text-dark;
      font-weight: 500;
      .now {
        font-size: large;
      }
    }
  }

  .message-list {
    flex: 1;
    padding: 20rpx 32rpx;
    overflow-y: scroll;
    background-color: transparent;

    // 隐藏滚动条
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }

    .message-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 40rpx;

      &.user {
        flex-direction: row-reverse;

        .bubble {
          background: linear-gradient(135deg, #cbdcff, #bcd7ff);
          color: #2c3440;
          box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
        }
      }

      &.assistant {
        .bubble {
          background: linear-gradient(135deg, #ecdfff, #e6d8ff);
          color: #3a2e4f;
          box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
        }
      }

      .avatar {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        margin: 0 20rpx;
        border: 2rpx solid rgba($lavender, 0.3);
      }

      .bubble {
        max-width: 70%;
        padding: 24rpx 32rpx;
        border-radius: 24rpx;
        font-size: 28rpx;
        line-height: 1.6;
        word-break: break-word;
        box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
        position: relative;
        border: 1rpx solid rgba(0, 0, 0, 0.04);
        user-select: text;

        &::after {
          content: "";
          position: absolute;
          top: 20rpx;
          width: 0;
          height: 0;
          border: 12rpx solid transparent;
        }
      }
    }
  }

  .input-area {
    display: flex;
    padding: 24rpx 32rpx;
    border-top: 2rpx solid rgba($lavender, 0.2);
    background-color: rgba($milky-white, 0.9);
    backdrop-filter: blur(20rpx);

    .input {
      flex: 1;
      height: 88rpx;
      padding: 0 32rpx;
      background: rgba(white, 0.9);
      border: 2rpx solid rgba($lavender, 0.3);
      border-radius: 20rpx;
      color: $text-dark;
      font-size: 28rpx;
      transition: all 0.3s;

      &:focus {
        border-color: $soft-blue;
        box-shadow: 0 0 20rpx rgba($soft-blue, 0.2);
      }
    }

    .send-btn {
      margin-left: 24rpx;
      padding: 0 40rpx;
      height: 88rpx;
      line-height: 88rpx;
      background-image: linear-gradient(135deg, $soft-blue, $lavender);
      color: white;
      font-size: 28rpx;
      border-radius: 20rpx;
      border: none;
      transition: all 0.3s;

      &:active {
        opacity: 0.8;
        transform: scale(0.98);
      }
    }
  }
}

.formClass {
  width: 100%;
}

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
</style>
