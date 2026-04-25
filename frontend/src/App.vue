<!-- ============================================================
  App.vue 根组件
  只负责渲染路由出口，所有页面内容在各个视图组件中
============================================================ -->
<template>
  <!-- 路由视图出口：根据当前路由渲染对应页面组件 -->
  <router-view />
</template>

<script setup>
// 根组件无需额外逻辑，路由由 router/index.js 控制
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
