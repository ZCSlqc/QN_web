# 生成方式

内置 imagegen，两轮生成。第一轮输入五只猫的身份参考，第二轮以第一轮输出为编辑目标。

## 毛色参考稿

Use case: stylized-concept / identity-preserve. Create ONE polished landscape character design lineup sheet for FIVE pet cats to appear at a cozy 2.5D wedding. The five input images are identity references in this exact order: 1 Liuyi 六一 orange-white tabby; 2 Anan 安安 silver-grey tabby with white bib and socks, round cheeks; 3 Guagua 瓜瓜 grey-brown tabby with a distinct white throat/bib, chest stripe and white socks, more slender face; 4 Huahua 花花 warm brown dark-striped tabby, NO white socks and NO large white bib or belly, tan muzzle and paws; 5 Heihei 黑黑 black tuxedo cat, white bib/chest patch, white toes/socks, gold eyes.

Composition: one horizontal row of exactly FIVE full-body cats, generous separation, aligned foot baseline, all the same apparent scale. Left to right 六一 安安 瓜瓜 花花 黑黑. All sitting in a relaxed attentive pose facing mostly forward with a very slight 3/4 turn, same slightly elevated orthographic viewing angle, absolutely no near/far size variation. Heads a little larger than realistic, compact bodies, short soft paws, tails visible curled to the side. Each kitten should retain its reference cat's identity and exact distribution of white fur. Liuyi is warm ginger with a white muzzle, central narrow white blaze, large white bib, white toes; Anan distinctly COOL silver and very round; Guagua clearly grey-brown with white chest and paws; Huahua clearly WARM brown, all paws brown, no invented orange/white markings; Heihei predominantly black with the characteristic white bib, belly patch and socks. Eyes warm expressive oval shapes, not enormous anime eyes.

Style: clean warm 2D comic/sticker illustration suitable for small game sprites. Soft flat color shapes, two-tone gentle cel shading, restrained thin warm dark outline, simplified few bold tabby stripes, rounded inviting silhouettes. NO photographic fur, no realistic rendering, no 3D model shading, no dense individual hairs. Must harmonize with simple Kenney-style modular cartoon humans on a richer illustrated garden backdrop. Keep cats as cats, not upright humans. Natural bodies, no clothing or accessories for this base design pass.

Background: plain very pale warm ivory with a faint small oval ground shadow under each cat. Small elegant heading top center exactly "婚礼上的五位小朋友". Below each cat, a clean readable Chinese name label exactly "六一", "安安", "瓜瓜", "花花", "黑黑". No other text, no watermark, no border, no wedding background, no props. The five full silhouettes and tails must be entirely visible. This is a coherent lineup for judging identities before generating animation assets.

## 简化漫画稿

undefined


## 婚礼透明坐姿素材（已接入）

工具：内置 imagegen；输入：lineup-cartoon.webp；transparent_background: true。

Convert the attached APPROVED five-cat character lineup into a production transparent PNG sprite sheet. Preserve exactly their existing cartoon designs, faces, colors, body proportions and sitting poses; do NOT redesign. Five complete seated cats left to right: orange white Liuyi, silver gray white Anan, gray brown white Guagua, warm brown tabby Huahua with NO white socks/chest, black white tuxedo Heihei. Remove ALL text, title, labels, paw icons, ivory background and ground shadows. True transparent alpha background. Keep every cat and tail fully within its own equally sized column in a single horizontal row, generous transparent gaps between cats, all same baseline and same height. Only five cats, no other marks. Intended for cropping each equal-width column as a separate game sprite. Save generated output for local project use.
