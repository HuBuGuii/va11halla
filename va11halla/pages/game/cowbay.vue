<template>
	<view>
		<text>this is cowboy page</text>
	</view>
</template>

<script setup lang="ts">
import { checkLogin } from '@/utils/checkLog.js'
import { onLoad } from '@dcloudio/uni-app'






onLoad(() => {
  if (!checkLogin()) return
})
</script>

<style lang="scss">
	       
</style>
