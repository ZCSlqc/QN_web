本目录已按用途整理，原图与发布路径详见 [README.md](README.md) 和 `manifest.json`。

# 六一日常素材

日常素材由内置 imagegen 生成，定稿文件保存在 `asset/pet/liuyi/`，发布文件位于 `frontend/public/pet/liuyi/`。当前维护源以 WebP 为准，运行 `npm --prefix frontend run assets:optimize` 即可同步发布；重复 PNG 已清理，需要再次裁切的图集保留同尺寸 WebP。

| 原图 | 发布文件 | 提示词要点 |
| --- | --- | --- |
| realistic/sleep.webp | realistic/sleep.webp | 参考六一三视图，写实橘白猫，正面闭眼，下巴枕两只白爪，只露头和爪，不含身体、窝、背景、文字。 |
| illustrated/sleep.webp | illustrated/sleep.webp | 参考六一插画的配色与线条，与写实版同一正面睡姿，只露头和爪，透明背景。 |
| interaction/hand-pet.webp | interaction/hand-pet.webp | 写实第一人称右手，从右下向左上轻抚，五指自然弯曲，只含手和短前臂，透明背景。 |
| interaction/hand-teaser.webp | interaction/hand-teaser.webp | 写实第一人称右手，从右下握木质逗猫棒，棒伸向左上，细绳和鼠尾草绿羽毛完整可见，透明背景。 |

手部图另做一次透明边缘修正：保留物体与姿态，去掉物体外的光晕、背景和模糊边缘；只保留轮廓抗锯齿。已在米色背景合成预览检查。

散步源图 `{realistic,illustrated}/walk-sheet.webp` 为2×2四帧侧身朝右步态。插画版以写实步态图约束姿势，两版统一脚底基线与播放时序；并非骨骼动画。
