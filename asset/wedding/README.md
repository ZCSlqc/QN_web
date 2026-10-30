# 婚礼场景素材

- `background/garden-orthographic.webp`：当前平行投影庭院背景，只发布这一张背景。旧故事书版、未接入的叠层和早期点位已清理。
- `kenney_modular-characters/`：原版 428 张 PNG、SVG 原稿、CC0 授权及 Derived 衣物与刚性四肢等衍生素材。
- `custom/formal/`：仍用于礼服重建的原版 SVG 提取模板。
- `original/`：自制食物、花礼、杂耍与婚戒，按类型分文件夹，编排参数见 `catalog.json`。
- `emoji/`、`pixelAnimal/`：定稿的透明头像正反面。
- `cats/`：五只猫的定稿坐姿、动作原图集与发布图集。
- `payment/`：保留原始 JPEG 收款码及庭院小牌使用的 WebP 预览。

共用爱心、星星、灯泡、信封位于 `asset/shared/icons/`。移动范围配置位于 `frontend/src/features/wedding/walkable-area.json`，不在美术资源目录重复发布。

从项目根目录执行 `npm --prefix frontend run assets:rebuild`，从此目录完整重建和发布，不依赖 artifacts 或项目外临时文件。图片按需加载，人物部件按原坐标与比例组合，不拉伸。

## 最终背景提示词（内置 imagegen）

Edit the attached wedding concept into a usable EMPTY GAME BACKGROUND. Preserve its beautiful warm ivory blush sage wedding garden, detailed flowers, lanterns, upper center flower arch stage, side refreshment tables, and generous central courtyard. CRITICAL CHANGE: strict ORTHOGRAPHIC PARALLEL PROJECTION, elevated 45 degree camera looking down. ZERO perspective convergence, ZERO vanishing point, ZERO near/far object scaling. Same-size floor tiles and pots remain exactly same size at top and bottom. Central aisle is constant width from bottom to stage, its two sides parallel vertical on image. Back and front horizontal floor lines parallel. No horizon or distant landscape. The stage upper center at 50% x, 28% y, standing floor at y34%, uses shallow steps, with plants and wall filling upper background. Frame full environment edge-to-edge 16:9 landscape. REMOVE EVERY PERSON, nickname, text, HUD, button, sign lettering and selection ring. Fill removed areas with ground. NO CHARACTERS. Keep all shading and lighting soft warm painterly miniature game art, no depth-of-field blur. Side flower beds stay around outer 15% edges, center 65% floor open for same-size 2D avatars. Camera is locked parallel orthographic exactly as an isometric strategy game, not a camera photograph. Must not look toward a far horizon; see top faces of platforms and tables, low front faces. This is production scenery layer only.
