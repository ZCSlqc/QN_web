# 固定素材原稿

原图放在 `asset/`，网页展示版放在 `frontend/public/`。两边使用同样的用途分类，不为单张图片再建目录。

```text
asset/                         frontend/public/
├─ backgrounds/                ├─ backgrounds/
│  ├─ home-cover.jpg            │  ├─ home-cover.webp
│  ├─ anniversary.jpg           │  ├─ anniversary.webp
│  └─ wedding-boutonniere.jpg   │  └─ wedding-boutonniere.webp
├─ avatars/qiqi.png             ├─ avatars/qiqi.webp
├─ avatars/nini.png             ├─ avatars/nini.webp
├─ pets/liuyi/                  ├─ pets/liuyi/
│  ├─ illustrated/              │  ├─ illustrated/
│  ├─ realistic/                │  ├─ realistic/
│  ├─ friends/anan.png          │  ├─ friends/anan.webp
│  ├─ icons/                   │  ├─ icons/
│  ├─ food/                    │  ├─ food/
│  ├─ interaction/             │  ├─ interaction/
│  ├─ weather/                 │  ├─ weather/
│  ├─ emotions/                │  ├─ emotions/
│  └─ sounds/                  │  └─ sounds/
├─ feedback/                   ├─ feedback/
├─ audio/city-of-stars.mp3      ├─ audio/city-of-stars.mp3
├─ maps/china/                 ├─ maps/china/
└─ branding/favicon.ico        └─ branding/favicon.ico
```

文件名小写英文，用短横线分词。原图保留真实格式；网页照片/插画采用WebP，小型图标保留PNG，音频MP3、地图GeoJSON、网站图标ICO。
猫咪风格目录存有多张动作图，所以保留分组；其中 `portrait.png`、`pose-sheet.png`、`walk-sheet.png` 等是原始素材，具名单帧WebP是已经对齐的源成品，发布时复制，不重新裁切。

`manifest.json` 记录全部58项源文件及发布路径。`npm run assets:optimize`（frontend目录）按清单重建；`node frontend/scripts/optimize-images.cjs --check` 只检查文件是否齐全。
未使用的 `love-note` 已归档到本地 `artifacts/unused-assets/love-note/`，不参与构建。备用胸花背景不被页面请求时不会产生下载流量。

用户照片不放在这里，仍使用 `backend/uploads/albums/照片UUID/` 和 `backend/uploads/journeys/旅程UUID/照片UUID/`。
