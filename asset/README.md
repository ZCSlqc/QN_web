# 页面素材目录

```text
asset/
  index/                  首页
    background/           封面、纪念日背景
    avatars/              琪琪、妮妮头像
  pet/                    宠物页面
    liuyi/                插画/写实动作、朋友、食物、天气、声音、交互
  journey/
    maps/china/           城市、省份与轮廓地图
  wedding/
    background/           婚礼花园背景
    kenney_modular-characters/  官方 PNG 部件、SVG 原稿、Derived 衍生服装、授权
    custom/formal/        项目礼服衍生模板
    pixelAnimal/          像素动物头像，独立正面与背面
    emoji/                精选emoji头像与临时感想共用素材
    original/             自制饮料、小食、中餐、甜品、两组花礼、杂耍与婚戒
    cats/                 婚礼猫咪NPC图集
  shared/                 跨页面资源
    audio/                背景音乐
    branding/             网站标识
    icons/                跨页面爱心、星星、灯泡、信封
    fonts/                字体原稿、授权与子集生成说明
  manifest.json           源素材 → 网页发布文件映射
  source-layout.json      旧源路径 → 新源路径映射，供生成脚本兼容
```

`asset/` 是唯一维护源，`frontend/public/` 是按 `manifest.json` 生成的发布副本，两边使用相同的页面分类。定稿位图以现有 WebP 为准；需要再次裁切的动作图集、头像背面、物品源图保存同尺寸无损 WebP，透明通道及可见像素不变，不再保留重复 PNG。原版人物 PNG 部件体积很小，继续保留；SVG、点位 JSON、授权和编辑模板也继续保留。收款码保留原始 JPEG，方便下载原图。

public 仅包含运行需要的文件，不发布 SWF、Spritesheet、原始 SVG 图集、示例图、素材目录页或尚未接入的背景叠层。`Derived/` 的服装、分段手臂和头饰 SVG 同时保存在源库，均登记发布清单，可独立重建。旅程照片与相册上传文件仍由后端管理。

`wedding/original/catalog.json` 是 44 张自制物件的总清单，36 件可以手持。食物按四类分类，每类 6 件；花礼按奶油花园和喜庆红金两组分类，每组 6 件。杂耍和婚戒独立分类，跨页面图标放入 `shared/icons/`。源与前端目录对应，生成说明见 `wedding/original/README.md`。

emoji 在“我的造型 → emoji”中可设为头像；婚礼工具栏表情会临时替换头像 5 秒。默认展示老虎机和 11 款特色表情，点击更多展开全部 29 款。普通背面共用黄色圆头，另有 6 款独立背面。已定稿的 256×256 透明 WebP 直接作为维护源，不保留重复原稿。

重建与检查（项目根目录）：

- `npm --prefix frontend run assets:rebuild`：依次重建衍生 SVG、杂耍道具、猫咪图集、头像和物品，再发布、清理并校验；不依赖 `artifacts/` 或临时导入目录。
- `npm --prefix frontend run assets:optimize`：按清单发布定稿资源，并清理未登记的发布文件。
- `npm --prefix frontend run assets:check`：检查源文件、发布内容一致且无未登记文件。
- `node frontend/scripts/curate-wedding-emojis.cjs`：校验并发布精选 emoji。
- `npm --prefix frontend run assets:original`：从透明图集重建自制物件。
- `node frontend/scripts/build-wedding-cat-actions.cjs`：重建猫咪图集。

生成脚本通过 `frontend/scripts/asset-layout.cjs` 将历史源路径映射到当前目录，不会重新创建旧的顶层分类。

发布及生成脚本仅在文件内容变化时写入 public，未变化文件保留修改时间与 ETag；重复重建不会让浏览器重新下载相同图片。原版 SVG 衍生文件和 JSON 清单也按内容判断是否更新。

可移动范围是前端交互配置，维护在 `frontend/src/features/wedding/walkable-area.json`，不在美术资源库或数据库。本机管理页 `/wedding/area` 可直接保存到该文件。
