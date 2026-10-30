# 手持物品与桌面美食

从用户提供的 `artifacts/food/`、`artifacts/good/` 与 `artifacts/emojiHead/` 整理，共18件物品（含礼花筒）。物件保存在本目录，食物独立归档到 `../food/`；原文件在各自 `sources/` 中保留。`sample.png` 是Kenney人物示意图，保存为 `../character/references/kenney-character-sample.png`，不作为物品发布。

## 浏览与使用

- 打开本目录 `index.html` 可离线浏览、按手持/桌面用途筛选；开发服务器也可访问 `/wedding/good/index.html`。
- `catalog.json` 是物品清单，包含稳定英文ID、中文名、分类、用途、原文件映射、透明图尺寸、握点、桌面落点及建议世界尺寸。
- 发布目录：`frontend/public/wedding/good/` ? `frontend/public/wedding/food/`。使用 `image` 字段加载WebP；分类是 drinks / fruits / food / meals / desserts / gifts / flowers / balloons / celebration。
- `anchors.hand` 和 `anchors.table` 是相对**裁切后发布图片**的0–1坐标；绘制起点 = 目标握点/桌面点 − 锚点 × 绘制尺寸。`suggestedWorldHeight` 是场景里的起始尺寸建议，不是像素尺寸。
- 握点是初始建议，接入人物手部后需校准遮挡与旋转；贴纸花束保留白描边。甜筒摆桌需配支架，蛋糕切片手持建议配小碟。
- 当前完成素材整理及用途配置，尚未增加婚礼页的物品选择或桌面陈列交互。

## 命名映射

| 原文件（不含扩展名） | 新ID | 中文名 |
|---|---|---|
| 8828bef0-609d-448e-8e09-84e6c09eea3e | party-popper | 礼花筒 |
| 可乐 | cola | 可乐 |
| 奶茶 | bubble-tea | 珍珠奶茶 |
| 汉堡 | burger | 汉堡 |
| 牛油果 | avocado-half | 半颗牛油果 |
| 甜甜圈 | strawberry-donut | 草莓糖霜甜甜圈 |
| 蛋挞 | egg-tart | 蛋挞 |
| 蛋糕 (1) | chocolate-berry-cake | 巧克力莓果蛋糕 |
| 蛋糕 (2) | cherry-cake-slice | 樱桃奶油蛋糕切片 |
| 雪糕 | cherry-ice-cream-cone | 樱桃冰淇淋甜筒 |
| flat-icon-birthday-balloons | balloon-bunch-burgundy-cream | 酒红奶油色气球束 |
| flat-icon-bouquet-wedding | bouquet-burgundy-white | 酒红白玫瑰花束 |
| sticker-bouquet-wedding | bouquet-blush-sticker | 浅粉花束（贴纸款） |
| 礼物 (1) | gift-box-mint-gold | 薄荷绿金色礼盒 |
| 礼物 | gift-box-red-gold | 红色金带礼盒 |
| 花 喇叭花 鲜花 | hibiscus-yellow | 黄色扶桑花（按图形命名） |
| 花 玫瑰花 鲜花 | rose-red | 红玫瑰 |
| 花 花篮 鲜花 玫瑰花 | flower-basket-pastel | 彩色鲜花篮 |

## 优化与重建

执行 `node frontend/scripts/organize-wedding-props.cjs`。首次从原目录导入，后续优先使用正式源文件。去除透明留白后限制长边248px、不放大原图，并保留4px透明边缘；以无损WebP发布。RGBA透明度保留，SVG保留在源目录供后续高分辨率用途使用，不作为网页内联代码加载。

脚本同步生成目录页、清单和发布副本，并登记到 `asset/manifest.json`，可以使用现有 `assets:optimize` 流程恢复发布副本。

17张原PNG共580,984字节，发布WebP共193,848字节，约减少66.6%。来源记录为用户提供的本地文件；未推断或补写未知授权。

## ???????

???? asset ???? 15 ? PNG ???????? `../food/sources/fruits/`?12 ??? `../food/sources/meals/`?3 ????????????????????? catalog.original ??????????????????????????????????????????????????????????????????????????
