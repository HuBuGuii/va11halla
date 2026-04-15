<template>
  <view class="legacy-chat-session"></view>
</template>

<script setup>
import { onLoad } from "@dcloudio/uni-app";

onLoad((options = {}) => {
  const query = Object.keys(options)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(options[key] || "")}`)
    .join("&");

  const url = query
    ? `/pages/chatBot/session/index?${query}`
    : "/pages/chatBot/session/index";

  uni.redirectTo({ url });
});
</script>
