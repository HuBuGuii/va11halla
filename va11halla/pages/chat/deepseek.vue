<template>
  <view class="chat-page">
    <scroll-view scroll-y class="message-list" :scroll-top="scrollTop">
      <view v-for="(msg, index) in messages" :key="index" class="message-item" :class="msg.role">
        <text>{{ msg.role === 'user' ? '👤' : '🤖' }} {{ msg.content }}</text>
      </view>
    </scroll-view>

    <view class="input-area">
      <input v-model="inputText" class="input" placeholder="请输入你的问题..." @confirm="sendMessage" />
      <button class="send-btn" @click="sendMessage">发送</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'

const inputText = ref('')
const messages = ref([])
const scrollTop = ref(0)
const chatHelper = uniCloud.importObject('chatHelper')


// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    scrollTop.value = Math.random() * 1000000 // 随机值强制触发滚动
  })
}

const mockDeepSeekReply = async (question) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`你刚才问的是「${question}」，这是 DeepSeek 的回答。`)
    }, 10)
  })
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text) return

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  scrollToBottom()

  messages.value.push({ role: 'bot', content: '正在思考中...' })
  scrollToBottom()

  const reply = await chatHelper.send(text)
  messages[messages.length - 1] = { role: 'bot', content: reply }
  scrollToBottom()
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
  padding:20rpx;
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
  /* 修复 iOS 输入框样式 */
  -webkit-appearance: none;
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