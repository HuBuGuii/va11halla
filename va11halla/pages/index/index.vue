<template>
  <view class="index">
    <!-- 顶部 Banner -->
    <view class="banner">
      <swiper class="banner" indicator-dots autoplay circular>
        <swiper-item v-for="(item, index) in banners" :key="index">
          <image :src="item.image" class="banner-image" mode="widthFix" />
        </swiper-item>
      </swiper>
    </view>

    <!-- 功能入口 -->
    <uni-section title="功能入口" type="line">
      <view class="grid">
        <view
          class="grid-item"
          v-for="(item, index) in features"
          :key="index"
          @tap="navigateTo(item.url)"
        >
          <image :src="item.icon" class="icon" />
          <view class="label">{{ item.name }}</view>
          <view>
            <text v-if="item.tag" class="tag">{{ item.tag }}</text>
          </view>
        </view>
      </view>
    </uni-section>
  </view>
</template>

<script setup>
const banners = [
  {
    image: "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/bk1.gif",
  },
  {
    image: "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/bk2.gif",
  },
];

const features = [
  {
    name: "牛仔对决",
    icon: "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/97b55ac5-2a9a-49e6-bd56-5cf756ec147e.png",
    url: "/pages/game/cowbay",
    tag: "NEW",
  },
  {
    name: "AI助手",
    icon: "https://mp-9aad41c1-5f10-47f1-8cb2-df81014d15d2.cdn.bspapp.com/cloudstorage/3793c49b-effb-4f0e-b7ef-f04b7eeb43b5.png",
    url: "/pages/chat/index",
    tag: "NEW",
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
  background-color: #f5f3fe; /* 与功能页一致的淡紫色背景 */
  min-height: 100vh;
  padding: 20px;
  color: #333;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}

.banner {
  margin-bottom: 20px;
  border-radius: 12rpx; /* 给整个 banner 区域加圆角 */
  overflow: hidden; /* 确保超出部分被隐藏 */
}

.banner-image {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.uni-section {
  margin-bottom: 24px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
  padding: 16px;
  border-left: 6px solid #7f5fff;
}

.uni-section__title {
  color: #5e5eac !important;
  font-weight: bold;
  font-size: 18px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220rpx, 1fr));
  gap: 20px;
  padding: 10px;
}

.grid-item {
  background-color: #ffffff;
  border-radius: 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  text-align: center;
  padding: 20px;
  transition: all 0.3s;
}

.grid-item:hover {
  transform: scale(1.02);
}

.icon {
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 10rpx;
}

.label {
  color: #333;
  font-size: 16px;
  font-weight: bold;
}

.tag {
  display: inline-block;
  background-color: #7f5fff;
  color: #fff;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 6px;
}
</style>