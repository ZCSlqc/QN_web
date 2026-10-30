<template>
  <section class="cat-friends" aria-labelledby="cat-friends-title">
    <h3 id="cat-friends-title">六一的好朋友们，欢迎你来看六一</h3>
    <div class="friends-row" tabindex="0" aria-label="好朋友照片，可左右滑动">
      <figure v-for="friend in friends" :key="friend.file">
        <img :src="`/pet/liuyi/friends/${friend.file}.webp`" :alt="friend.name" loading="lazy" decoding="async" />
        <figcaption>{{ friend.name }}</figcaption>
      </figure>
    </div>
  </section>
</template>

<script setup>
const friends = [
  { name: '安安', file: 'anan' },
  { name: '瓜瓜', file: 'guagua' },
  { name: '花花', file: 'huahua' },
  { name: '黑黑', file: 'heihei' },
]
</script>

<style scoped>
.cat-friends { margin-top: 24px; padding-top: 20px; border-top: 1px solid #f0e6e2; min-width: 0; }
h3 { margin: 0 0 16px; font-family: 'SimSun', 'Songti SC', serif; font-size: 16px; font-weight: 400; color: var(--color-text); letter-spacing: 1px; }
.friends-row { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(82px, 1fr); gap: 12px; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x proximity; padding-bottom: 8px; }
figure { margin: 0; min-width: 0; scroll-snap-align: start; }
img { display: block; width: 100%; height: 148px; object-fit: contain; background: #fff; }
figcaption { margin-top: 10px; text-align: center; font-size: 13px; letter-spacing: 2px; color: var(--color-text-light); }
@media (max-width: 600px) {
  .friends-row { grid-auto-columns: minmax(88px, 1fr); gap: 10px; }
  img { height: 136px; }
}
</style>
