<template>
	<view>
		<text>前面的区域下次再来探索吧</text>
		<text>先去ai助手那逛逛怎么样</text>
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
