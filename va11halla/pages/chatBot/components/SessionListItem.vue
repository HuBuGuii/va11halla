<template>
  <view class="session-item" @click="$emit('click')">
    <view class="session-main">
      <image class="session-avatar" :src="avatar" mode="aspectFill" />
      <text class="session-title">{{ title }}</text>
    </view>
    <view class="session-badge" :class="badgeClass">
      <text class="session-badge-text">{{ badgeLabel }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  title: {
    type: String,
    default: "Session",
  },
  avatar: {
    type: String,
    default: "",
  },
  showPub: {
    type: String,
    default: "private",
  },
});

defineEmits(["click"]);

const normalized = computed(() => String(props.showPub || "").toLowerCase());

const badgeLabel = computed(() => {
  if (normalized.value === "public") {
    return "Public";
  }

  if (normalized.value === "friend") {
    return "Friend";
  }

  return "Private";
});

const badgeClass = computed(() => {
  if (normalized.value === "public") {
    return "is-public";
  }

  if (normalized.value === "friend") {
    return "is-friend";
  }

  return "is-private";
});
</script>

<style scoped lang="scss">
.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 18rpx 8rpx;
  border-bottom: 1px solid rgba(186, 208, 255, 0.26);
}

.session-main {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.session-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: rgba(238, 245, 255, 1);
  border: 1px solid rgba(174, 201, 255, 0.38);
  flex-shrink: 0;
}

.session-title {
  min-width: 0;
  flex: 1;
  font-size: 30rpx;
  color: #2f3952;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-badge {
  flex-shrink: 0;
  min-width: 126rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  border: 1px solid transparent;
}

.session-badge.is-private {
  background: rgba(133, 181, 255, 0.2);
  border-color: rgba(133, 181, 255, 0.45);
}

.session-badge.is-public {
  background: rgba(117, 224, 166, 0.2);
  border-color: rgba(117, 224, 166, 0.45);
}

.session-badge.is-friend {
  background: rgba(255, 198, 130, 0.2);
  border-color: rgba(255, 198, 130, 0.45);
}

.session-badge-text {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #4a608f;
  white-space: nowrap;
}
</style>
