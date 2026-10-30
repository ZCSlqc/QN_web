# 动物头像与背面

12种动物正面原图保持不变。`animal-backs-source.webp` 为内置imagegen基于正面参考制作的4列3行背面图集；`animal-*-back.webp` 为逐格裁切的独立透明背面。

重建命令：`node frontend/scripts/build-animal-backs.cjs`。源文件保存在此处，发布路径通过素材清单映射到 `/wedding/pixelAnimal/`。

渲染以可见透明轮廓裁切，正反面都以同一头底坐标（人物本地y=-355）挂在脖子上；背面等比例适配对应正面外框，不使用正面五官。猴子与兔子保留按脸宽校准的比例。

生成方式：内置imagegen，透明背景。参考：`artifacts/wedding-research/animal-front-reference.png`。

提示词：

Create a production transparent PNG sprite sheet of BACK VIEWS of the 12 pixel-art animal HEADS in the reference, same palette, chunky square pixels and dark brown stepped outlines. Strict 4 columns x 3 rows equal cells. Preserve corresponding species and exact front silhouette proportions as closely as possible, heads only, NO bodies/necks/faces/text/gridlines/shadows. Each head directly viewed FROM BEHIND, no eyes, nose, mouth, muzzle or inner pink ear fronts. Rows/order MUST match reference: row1 bear, yellow chick, white chicken with red comb, orange fox; row2 green frog (back of eye bumps, no eyes), brown monkey with ears, pink pig, cream rabbit with tall ears; row3 brown tabby cat, orange tiger, white bird, cream white cat. Back patterns: subtle darker nape patches and pixel fur marks, tabby/tiger dark stripes on back of skull, fox orange nape cream lower edge, simple feather marks on birds. Animal identification via ears, silhouette and coat only. All isolated with generous transparent gaps and same bottom baseline in each row, perfectly centered in cells. Hard pixel edges, no gradients, no anti-alias style. True transparent background. Keep every entire head including ears inside its cell.
