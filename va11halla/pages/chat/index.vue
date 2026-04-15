<template>
  <view class="legacy-chat-index"></view>
</template>

<script setup>
import { onLoad } from "@dcloudio/uni-app";

onLoad(() => {
  uni.redirectTo({
    url: "/pages/chatBot/index/index",
  });
});
</script>
