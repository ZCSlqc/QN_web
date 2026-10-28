<!-- ============================================================
  App.vue 根组件
  渲染路由页面，并保留跨页面的音乐播放状态
============================================================ -->
<template>
  <!-- 路由视图出口：根据当前路由渲染对应页面组件 -->
  <router-view />
  <MusicPlayer />
  <FoodRewardFlight />
</template>

<script setup>
import MusicPlayer from './features/music/MusicPlayer.vue'
import FoodRewardFlight from './features/pet/FoodRewardFlight.vue'
</script>

<style>
/* 全局基础样式：去掉浏览器默认边距 */
* {
  box-sizing: border-box;
}
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>
