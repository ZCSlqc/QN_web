<template>
  <img class="pet-food-icon" :src="icons[kind] || icons.treat" alt="" aria-hidden="true" width="48" height="48" />
</template>
<script setup>
defineProps({ kind: { type: String, default: 'treat' } })
const icons = { treat: '/pet/liuyi/icons/cat-treat.png', kibble: '/pet/liuyi/icons/cat-food.png', can: '/pet/liuyi/icons/cat-can.png' }
</script>
<style scoped>
.pet-food-icon { display: block; width: 48px; height: 48px; flex-shrink: 0; object-fit: contain; }
</style>
