<template>
	<view class="index">
		<view class="graph"></view>
		<view class="container">
			<!-- 顶部 Banner -->
			<swiper class="banner" indicator-dots autoplay circular>
				<swiper-item v-for="(item, index) in banners" :key="index">
					<image :src="item.image" class="banner-image" mode="aspectFill" />
				</swiper-item>
			</swiper>

			<!-- 功能入口 -->
			<view class="grid">
				<view class="grid-item" v-for="(item, index) in features" :key="index" @tap="navigateTo(item.url)">
					<image :src="item.icon" class="icon" />
					<view class="label">
						{{ item.name }}
					</view>
					<view><text v-if="item.tag" class="tag">{{ item.tag }}</text></view>
				</view>
			</view>
		</view>

	</view>
</template>

<script setup>
	const banners = [{
			image: "/static/banner1.jpg",
		},
		{
			image: "/static/banner2.jpg",
		},
	];

	const features = [{
			name: "牛仔对决",
			icon: "/static/icons/game.png",
			url: "/pages/game/cowbay",
			tag: "NEW",
		},
		{
			name: "AI助手",
			icon: "/static/icons/chat.png",
			url: "/pages/chat/index",
			tag: "NEW",
		},
		{
			name: "排行榜",
			icon: "/static/icons/rank.png",
			url: "/pages/rank/index",
		},
		{
			name: "抽卡模拟",
			icon: "/static/icons/draw.png",
			url: "/pages/draw/index",
		},
		{
			name: "角色图鉴",
			icon: "/static/icons/role.png",
			url: "/pages/role/index",
		},
	];

	const navigateTo = (url) => {
		uni.navigateTo({
			url,
		});
	};
</script>

<style scoped lang="scss">
	.index {
		position: relative;
		height: 100vh;
		width: 100vw;
	}

	.graph {
		position: fixed;
		top: 0;
		width: 100%;
		height: 100vh;
		background-color: rgb(24, 183, 195);
		z-index: -1;
	}

	.container {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		padding-bottom: 80rpx;
		/* 预留给 tabBar */
	}

	.banner {
		height: 300rpx;
	}

	.banner-image {
		width: 100%;
		height: 100%;
		border-radius: 12rpx;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220rpx, 1fr));
		gap: 30rpx 20rpx;
		padding: 20rpx;
	}

	.grid-item {
		position: relative;
		background-color: #ffffff;
		border-radius: 8rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
		text-align: center;
		padding: 20rpx;
	}

	.icon {
		width: 96rpx;
		height: 96rpx;
		margin: 0 auto 10rpx;
	}

	.label {
		color: #000000;
		font-size: 26rpx;
	}

	.tag {
		position: absolute;
		background: #f90;
		color: #000;
		font-size: 20rpx;
		padding: 2rpx 6rpx;
		border-radius: 6rpx;
		right: 0;
		bottom: 0;
	}
</style>