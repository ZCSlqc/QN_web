# emoji 头像

29 张正面、7 张背面定稿图，统一为 256×256 透明 WebP。这些小图直接作为维护源，不再保留重复的 sources 大图。正面来自用户素材，独立背面使用 imagegen 绘制，提示词保留于 `back-prompts.json`。

`catalog.json` 记录 ID、中文名、featured 精选标记、尺寸、锚点和 backFile。修改精选与排序以此文件为准，脚本不会重置。工具栏首页为老虎机和 11 款特色表情，点“更多”展开全部。衣橱可设为常用头像，工具栏表情则临时换头 5 秒。

主体保持原比例，位于 224×224 区域，公共挂点 (128,248)。一般背面共用 yellow-back，派对、小恶魔、隐身、冰冻、冒烟、秘密使用独立背面。

根目录执行 `node frontend/scripts/curate-wedding-emojis.cjs` 校验并发布正面和前端清单；`node frontend/scripts/build-emoji-backs.cjs` 校验并发布背面。完整同步使用 `npm --prefix frontend run assets:rebuild`。礼花筒属于 `wedding/original/flowers/` 物件。
