<template>
  <view v-if="text" class="error-banner">
    <text class="error-text">{{ text }}</text>
    <view class="close-btn" @click="$emit('close')">
      <uni-icons type="closeempty" size="16" color="#6b7aa6" />
    </view>
  </view>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: "",
  },
});

defineEmits(["close"]);
</script>

<style scoped lang="scss">
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

.error-text {
  display: block;
  line-height: 1.5;
  word-break: break-word;
}

.close-btn {
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
</style>
