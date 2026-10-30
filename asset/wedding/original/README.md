# 自制婚礼物件

44 张独立透明 WebP：饮料、小食、中餐、甜品各 6 张，花礼 12 张，杂耍道具 3 张，婚戒 1 张，共用图标 4 张。共用图标放在 `asset/shared/icons/`，其余按本目录子文件夹分类；发布目录与源目录路径一致。

- `drinks/`、`snacks/`、`meals/`、`desserts/`：四组食物。
- `flowers/garden/`、`flowers/festive/`：奶油花园、喜庆红金，各 6 件。
- `juggling/`：元宝、金条、钱币；`decorations/`：婚戒。
- `catalog.json`：尺寸、分类、握点、桌面锚点、单双手与显示高度。
- `source/approved-sheet.prompt.md`：已确认的整套美术要求，重复预览图已清理。
- `source/sprite-atlas.webp`：实际拆图输入，无损 WebP 保留透明度及所有可见像素；对应 `.prompt.md` 记录图集整理要求。

画面由 imagegen 生成。生成工具输出的实际图集并非严格方格，脚本使用已校准的对象种子与连通区域拆分；不重新绘画或拉伸，四周增加 4 像素透明边，网页 WebP 使用 quality 90、alphaQuality 100，原始图集保留。变更图集后需重新校准种子，不能直接替换为不同尺寸图集。

在项目根目录执行 `npm --prefix frontend run assets:original` 重建 44 张 WebP 与目录清单，再执行 `npm --prefix frontend run assets:optimize` 发布。`npm --prefix frontend run assets:rebuild` 包含这两步及完整一致性校验。不会发布原稿、提示词和图集。
