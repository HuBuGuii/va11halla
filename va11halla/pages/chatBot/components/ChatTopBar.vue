<template>
  <view class="chat-top-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
    <view class="bar-btn" @click="$emit('back')">
      <uni-icons type="left" :size="leftIconSize" :color="iconColor" />
    </view>
    <view class="bar-title">
      <view class="title-group">
        <text class="title-text">{{ title }}</text>
        <text v-if="subtitle" class="subtitle-text">{{ subtitle }}</text>
      </view>
    </view>
    <view v-if="showRight" class="bar-btn" @click="$emit('action')">
      <uni-icons :type="rightIcon" :size="rightIconSize" :color="iconColor" />
    </view>
    <view v-else class="bar-btn bar-btn-placeholder" />
  </view>
</template>

<script setup>
defineProps({
  statusBarHeight: {
    type: Number,
    default: 0,
  },
  title: {
    type: String,
    default: "Chat",
  },
  subtitle: {
    type: String,
    default: "",
  },
  showRight: {
    type: Boolean,
    default: false,
  },
  rightIcon: {
    type: String,
    default: "gear",
  },
  iconColor: {
    type: String,
    default: "#1f2937",
  },
  leftIconSize: {
    type: Number,
    default: 22,
  },
  rightIconSize: {
    type: Number,
    default: 20,
  },
});

defineEmits(["back", "action"]);
</script>

<style scoped lang="scss">
.chat-top-bar {
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

.bar-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bar-btn-placeholder {
  opacity: 0;
}

.bar-title {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 12rpx;
}

.title-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.title-text {
  max-width: 420rpx;
  font-size: 32rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subtitle-text {
  margin-top: 4rpx;
  max-width: 520rpx;
  font-size: 20rpx;
  color: #7b8ec8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
