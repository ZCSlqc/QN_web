# 字体源文件

`lato-medium.ttf` 和 `great-vibes-regular.ttf` 是字体原稿；Great Vibes 授权保留在同目录，Lato 版权信息从字体元数据提取，与完整 OFL 条款保存于 `lato-license.txt`。前端只保留实际使用的两张 WOFF2 子集，中文使用系统字体。

执行 `npm --prefix frontend run assets:ui` 从原稿生成子集及浏览器图标；需要 Python 的 `fonttools[woff]` 和 Pillow。普通前端构建和素材发布直接使用定稿文件，不需要 Python。

已移除未使用的中文网络字体、EOT、WOFF 和 Bootstrap 样式。字体子集保留拉丁扩展、组合重音、标点、货币、箭头以及相关 OpenType 连字与替代字形。
