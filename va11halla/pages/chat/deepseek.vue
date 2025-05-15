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
  </view>
  
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";

interface message {
  role: string;
  content: string;
}

const inputText = ref("");
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
const modelName = ref("deepseek-ai/DeepSeek-V3"); // 或 deepseek-ai/DeepSeek-V3
const title = ref("");

onLoad(async (options) => {
  title.value = options.title || "聊天";
  uni.setNavigationBarTitle({ title });
  session_id.value = options.id;
  botAvatar.value = options.avatar;

  prompt.value = await chatHelper.getPrompt(session_id.value);
});

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    scrollTop.value = Math.random() * 1000000;
  });
};

const openSettings = () => {

}

const sendMessage = async () => {
  const text = inputText.value.trim();
  if (!text) return;

  inputFocused.value = false;
  // 添加用户消息
  messages.value.push({ role: "user", content: text });
  inputText.value = "";
  scrollToBottom();

  // 添加机器人“思考中”
  messages.value.push({ role: "assistant", content: "正在思考中..." });
  scrollToBottom();

  // 模拟接口回复
  const reply = await sendMessageToGPT(messages.value);
  messages.value[messages.value.length - 1] = {
    role: "assistant",
    content: reply,
  };
  scrollToBottom();

  nextTick(() => {
    inputFocused.value = true;
  });
};

const sendMessageToGPT = async (messages: any[]) => {
  let sendMes = [
    { role: "system", content: prompt.value },
    ...messages.slice(0, -1).map((m) => ({
      role: m.role,
      content:
        typeof m.content === "object" && m.content.value !== undefined
          ? m.content.value
          : m.content,
    })),
  ];
  console.log(sendMes);
  try {
    const res = await uni.request({
      url: "https://api.siliconflow.cn/v1/chat/completions",
      method: "POST",
      header: {
        Authorization:
          "Bearer sk-lgquhuftllbtjnwauywqnmwujsowlkrlddgyovlevkbmnxxj",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: {
        model: modelName.value,
        messages: sendMes,
        stream: false,
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        frequency_penalty: 0.5,
        n: 1,
        response_format: {
          type: "text",
        },
      },
    });

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

watch(
  messages,
  (newVal) => {
    console.log("新的messages是", newVal);
  },
  {
    deep: true,
  }
);
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
</style>
