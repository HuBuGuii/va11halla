<template>
  <view class="chat-page">
    <view class="buttons"><button
      @click="clickB"
    >
      测试按钮
    </button></view>
    <scroll-view scroll-y class="message-list" :scroll-top="scrollTop">
      <view
        v-for="(msg, index) in messages"
        :key="index"
        class="message-item"
        :class="msg.role"
      >
        <text>{{ msg.role === "user" ? "👤" : "🤖" }} {{ msg.content }}</text>
      </view>
    </scroll-view>

    <view class="input-area">
      <input
        v-model="inputText"
        class="input"
        placeholder="请输入你的问题..."
        @confirm="sendMessage"
      />
      <button class="send-btn" @click="sendMessage">发送</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, nextTick } from "vue";
import { onLoad } from '@dcloudio/uni-app'

const inputText = ref("");
const messages = ref([]);
const scrollTop = ref(0);
const chatHelper = uniCloud.importObject("chatHelper");
const session_id = ref("");
const userInput = ref("");
const systemPrompt = ref({})
const localMessages = ref([]);

onLoad(async (options) => {
  const title = options.title
  uni.setNavigationBarTitle({ title: title })
  const id = options.id
  session_id.value = id;
  console.log(id)
  const cloudMes = chatHelper.getMessages({ id });
  if (cloudMes.length > 0) {
  }
});

const handleSend = async () => {
  const content = inputText.value.trim();
  if (!content) return;

  localMessages.value.push({
    role: "user",
    content,
  });

  inputText.value = "";

  chatHelper.saveMessage({ session_id, role: "user", content });

  const gptReply = await callGpt(localMessages.value)


};

const callGpt = async(messages) => {
  try {
    const res = await uni.request({
  url: 'https://api.siliconflow.cn/v1/chat/completions',
  method: 'POST',
  dataType: 'json',
  header: {
    Authorization: 'Bearer sk-lgquhuftllbtjnwauywqnmwujsowlkrlddgyovlevkbmnxxj',
    Accept: 'application/json',
    'Content-Type': 'application/json'
  },
  data: {
    model: 'deepseek-ai/DeepSeek-R1',
    messages,
    stream: false,
    max_tokens: 512,
    temperature: 0.7,
    top_p: 0.7,
    top_k: 50,
    frequency_penalty: 0.5,
    n: 1,
    response_format: {
      type: 'text'
    }
  }
})

console.log('GPT 返回结果：', res.data)
  } catch (error) {
console.log("error",error)
  }
}
// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    scrollTop.value = Math.random() * 1000000; // 随机值强制触发滚动
  });
};

const mockDeepSeekReply = async (question) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`你刚才问的是「${question}」，这是 DeepSeek 的回答。`);
    }, 10);
  });
};



const sendMessage = async () => {
  const text = inputText.value.trim();
  if (!text) return;

  messages.value.push({ role: "user", content: text });
  inputText.value = "";
  scrollToBottom();

  messages.value.push({ role: "bot", content: "正在思考中..." });
  scrollToBottom();

  const reply = await chatHelper.send(text);
  messages[messages.length - 1] = { role: "bot", content: reply };
  scrollToBottom();
};

const clickB = async() => {
  const info =  uniCloud.getCurrentUserInfo()
  const uid = info.uid
  console.log(uid)
  const reply = await chatHelper.getSessions(uid)
  console.log("reply is ===",reply);
  
}
</script>

<style scoped lang="scss">
/* 全局禁用滚动 */
page {
  overflow: hidden;
  height: 100%;
}

.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* 在 uni-app 中可能需要使用 100% 而不是 vh */
  height: 100%;
}

.message-list {
  flex: 1;
  padding: 16rpx;
  /* 移除 overflow-y: scroll，因为 scroll-view 已经处理 */
  background-color: #f5f5f5;
  /* 确保内容不会溢出 */
  box-sizing: border-box;

  /* 解决 iOS 滚动卡顿 */
  -webkit-overflow-scrolling: touch;
}

.message-item {
  margin-bottom: 12rpx;
  line-height: 1.6;
  word-break: break-word; /* 长文本自动换行 */
}

.message-item.user {
  text-align: right;
  color: #333;
}

.message-item.bot {
  text-align: left;
  color: #007aff;
}

.input-area {
  padding: 20rpx;
  display: flex;
  border-top: 1px solid #ddd;
  background-color: #fff;
  /* 防止键盘弹出时被挤压 */
  position: sticky;
  bottom: 0;
}

.input {
  padding-left: 20rpx;
  height: 80%;
  flex: 1;
  border: 1px solid #ccc;
  border-radius: 8rpx;
}

.send-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80%;
  margin-left: 15rpx;
  padding: 0 16rpx;
  background-color: #266bb4;
  color: white;
  border-radius: 8rpx;
  /* 移除默认按钮样式 */
  border: none;
  outline: none;
}
</style>
