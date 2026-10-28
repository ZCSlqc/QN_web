<template>
  <div class="cat-tree" aria-hidden="true">
    <div class="tree-base"></div><div class="tree-post post-tall"></div><div class="tree-post post-short"></div>
    <div class="tree-platform platform-low"></div><div class="tree-platform platform-high"><span></span></div>
    <div class="tree-rope"><i></i></div>
  </div>
  <div class="water-bowl" :class="{ drinking }" role="img" aria-label="六一的清水盆">
    <div class="water-rim"><div class="water-surface"><i></i><i></i></div></div><span class="bowl-glint"></span>
  </div>
</template>
<script setup>
defineProps({ drinking: Boolean })
</script>
<style scoped>
.cat-tree { position: absolute; left: 5%; bottom: 30px; width: 160px; height: 215px; z-index: 5; pointer-events: none; filter: drop-shadow(3px 8px 5px #6e513123); }
.tree-base { position: absolute; bottom: 0; width: 100%; height: 26px; border-radius: 50%; background: linear-gradient(#e6d5bd, #c0a181); border-bottom: 7px solid #b49678; }
.tree-post { position: absolute; width: 24px; background: repeating-linear-gradient(0deg, #b99b76 0 2px, #dbc39d 3px 5px); border-radius: 6px; box-shadow: inset -7px 0 7px #79593624, inset 3px 0 3px #fff7e459; bottom: 16px; }
.post-tall { left: 36px; height: 183px; }.post-short { right: 30px; height: 111px; }
.tree-platform { position: absolute; height: 20px; border-radius: 50%; background: #e8dac5; border-bottom: 8px solid #c6ad8f; box-shadow: 0 4px 5px #6e51311a; }
.platform-low { width: 90px; right: 0; bottom: 112px; transform: rotate(-5deg); }
.platform-high { width: 110px; left: 0; top: 0; height: 36px; background: #cfb599; border: 8px solid #e5d5bf; box-shadow: inset 0 4px 7px #84644835; }
.platform-high span { position: absolute; inset: 3px; border-radius: 50%; background: #d8c1a5; }
.tree-rope { position: absolute; left: 87px; top: 34px; height: 48px; border-left: 1px solid #947654; }
.tree-rope i { position: absolute; left: -10px; bottom: -10px; width: 19px; height: 19px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ebdfce, #b29a7c); }
.water-bowl { position: absolute; left: 28%; bottom: 81px; transform: translateX(-50%); width: 82px; height: 42px; border-radius: 10% 10% 45% 45%; background: linear-gradient(100deg, #c5ad91, #f1e7d8 45%, #dfcbb2 75%, #b69b7e); box-shadow: 0 5px 5px #75604a2b; z-index: 5; pointer-events: none; }
.water-rim { position: absolute; top: -5px; left: 0; width: 100%; height: 27px; border: 5px solid #f0e5d5; border-radius: 50%; background: #a59f8f; overflow: hidden; }
.water-surface { position: absolute; inset: 3px 1px 0; border-radius: 50%; background: linear-gradient(165deg, #bec9c4, #e0e6dc); box-shadow: inset 0 2px 3px #7e897b40; }
.water-surface::after { content: ''; position: absolute; width: 27px; height: 3px; top: 3px; right: 8px; background: #f1fcf6a0; border-radius: 50%; }
.bowl-glint { position: absolute; left: 18px; bottom: 7px; width: 19px; height: 2px; border-radius: 50%; background: #fff6e675; }
.drinking .water-surface i { position: absolute; inset: 2px 20px; border: 1px solid #f2fffac0; border-radius: 50%; animation: water-ripple 1.4s ease-out infinite; }
.drinking .water-surface i:nth-child(2) { animation-delay: -.7s; }
@keyframes water-ripple { from { transform: scale(.25); opacity: .8; } to { transform: scale(2.3); opacity: 0; } }
@media (max-width: 768px) {
 .cat-tree { left: 3%; width: 100px; height: 140px; bottom: 40px; }
 .tree-base { height: 20px; }.post-tall { left: 23px; height: 115px; }.post-short { right: 15px; height: 72px; }.tree-post { width: 18px; }
 .platform-high { width: 76px; height: 29px; border-width: 6px; }.platform-low { width: 60px; bottom: 74px; height: 16px; }.tree-rope { left: 62px; top: 29px; height: 28px; }
 .water-bowl { left: 27%; width: 62px; height: 32px; bottom: 64px; }.water-rim { height: 23px; border-width: 4px; }
}
@media (prefers-reduced-motion: reduce) { .drinking .water-surface i { animation: none; } }
</style>
