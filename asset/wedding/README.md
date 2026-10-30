# 婚礼场景素材

## 发布资产

- `garden-orthographic.png`：内置imagegen生成，参考最早的花园婚礼概念图（删除人物和UI），重新约束为平行投影。发布到 `frontend/public/wedding/background/garden-orthographic.webp`，原图保留。
- `modular/`：Kenney Modular Characters 官方包的全部428张PNG分层部件（`characters/`保留初版精选素材），CC0-1.0；`LICENSE.txt` 保留原授权，`catalog.json` 标明原文件对应关系。没有使用下载包中的SWF或执行其中代码。
- 图片使用 Canvas 2D 实时组合。衣服配色、背面轮廓、婚纱及配饰为本地适配，不是素材包原带的婚礼角色。

## 外部素材调研

采用：https://kenney.nl/assets/modular-characters （425项2D分层部件，CC0）。

备选：https://kenney.nl/assets/toon-characters （270项2D姿态，CC0）。角色更偏冒险主题，本次选择更方便换婚服的Modular套件。

## 最终背景提示词（内置 imagegen）

Edit the attached wedding concept into a usable EMPTY GAME BACKGROUND. Preserve its beautiful warm ivory blush sage wedding garden, detailed flowers, lanterns, upper center flower arch stage, side refreshment tables, and generous central courtyard. CRITICAL CHANGE: strict ORTHOGRAPHIC PARALLEL PROJECTION, elevated 45 degree camera looking down. ZERO perspective convergence, ZERO vanishing point, ZERO near/far object scaling. Same-size floor tiles and pots remain exactly same size at top and bottom. Central aisle is constant width from bottom to stage, its two sides parallel vertical on image. Back and front horizontal floor lines parallel. No horizon or distant landscape. The stage upper center at 50% x, 28% y, standing floor at y34%, uses shallow steps, with plants and wall filling upper background. Frame full environment edge-to-edge 16:9 landscape. REMOVE EVERY PERSON, nickname, text, HUD, button, sign lettering and selection ring. Fill removed areas with ground. NO CHARACTERS. Keep all shading and lighting soft warm painterly miniature game art, no depth-of-field blur. Side flower beds stay around outer 15% edges, center 65% floor open for same-size 2D avatars. Camera is locked parallel orthographic exactly as an isometric strategy game, not a camera photograph. Must not look toward a far horizon; see top faces of platforms and tables, low front faces. This is production scenery layer only.
