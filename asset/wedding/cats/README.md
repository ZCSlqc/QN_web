# 婚礼五只猫 · 造型设计

本目录保存已确认的设定图和婚礼页面使用的透明坐姿素材。通过内置 imagegen 生成，以写实参考确定身份与毛色，再统一简化为漫画角色。

参考来源：

- 六一：`asset/pet/liuyi/realistic/portrait.webp`，橘白、白胸白爪。
- 安安：`asset/pet/liuyi/friends/anan.webp`，冷银灰虎斑、圆脸、白胸白袜。
- 瓜瓜：`asset/pet/liuyi/friends/guagua.webp`，灰棕狸花、白胸白袜。
- 花花：`asset/pet/liuyi/friends/huahua.webp`，暖棕狸花，棕爪，不添加大白胸或白袜。
- 黑黑：`asset/pet/liuyi/friends/heihei.webp`，黑色、白胸腹花纹、白袜、金色眼睛。

`artifacts/pet/` 漫画版作为姿态参考，但花花毛色与写实图有差异，本次以写实图为准。

`lineup-cartoon.webp` 是确认后的造型预览，使用圆头短身和大色块。较早的细节版草图已清理，提示词保存在 `prompts.md`。

`sitting-transparent.webp` 是按已确认的 `lineup-cartoon.webp` 使用内置 imagegen 去除背景、文字与阴影后生成的透明素材；完整提示词见 `prompts.md`。五只猫分别裁切、保留 alpha 并缩小至高232px，保存为 `liuyi.webp`、`anan.webp`、`guagua.webp`、`huahua.webp`、`heihei.webp`。发布副本位于 `frontend/public/wedding/cats/`，已登记素材清单。

婚礼内采用统一尺度，坐姿高58世界单位，按脚底位置与人物一起排序遮挡。点击显示名字、性格与爱心，附近两只猫会响应祝福。设定图和裁切源使用 WebP，不再保留重复 PNG。

## 自由活动素材

每只猫的 `*-actions-source.webp` 为同尺寸无损源图：3列2行，依次为四帧右向迈步、闭眼趴卧、举爪。完整提示词保存在 `action-prompts.json`。左右行走通过水平镜像适配；当前没有独立的正背面行走帧，小跑复用迈步帧并按路程加速。

`node frontend/scripts/build-wedding-cat-actions.cjs` 按主体连通区域裁切，排除相邻格碎片，统一脚底基线和行走帧比例，保留透明通道，输出每帧320×256、共六帧的 `*-actions.webp`，并同步发布目录及素材清单。动画按实际行走距离换帧，停下不空转。

资源整理（2026-10-31）：五张透明坐姿 WebP 作为定稿源，五张 `*-actions-source.webp` 供动作图集重建；旧的 lineup 预览和 sitting-transparent 整图已清理，上文对它们的描述仅记录生成来源。提示词保留，后续以五张定稿坐姿为参考。
