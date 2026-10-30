import request from "../../utils/request";
import { createCatLife, moving } from "./catLife";

export async function loadCats({ signal } = {}) {
  const { data } = await request.get("/wedding/cats", { signal });
  const ids = ["liuyi", "anan", "guagua", "huahua", "heihei"];
  if (!Array.isArray(data.cats) || data.cats.length !== 5 ||
      !ids.every((id) => data.cats.some((cat) => cat.id === id))) throw new Error("Invalid cat configuration");
  const life = createCatLife(data.cats);
  const images = await Promise.all(life.cats.map(async (cat) => {
    const image = new Image();
    image.src = `/wedding/cats/${cat.id}.webp`;
    const atlas = new Image();
    atlas.src = `/wedding/cats/${cat.id}-actions.webp`;
    await Promise.all([image.decode(), atlas.decode()]);
    return { image, atlas };
  }));
  const cats = life.cats;
  cats.forEach((cat, i) => Object.assign(cat, images[i]));
  return {
    ...life,
    cats,
    draw(ctx, cat, time, reduced) {
      const height = 58, width = height * cat.image.width / cat.image.height;
      ctx.save();
      ctx.fillStyle = "#624b3625";
      ctx.beginPath();
      ctx.ellipse(cat.x, cat.y - 2, 23, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      function drawPose(state, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cat.x, cat.y);
        ctx.scale(cat.facing, 1);
        if (["walk", "trot", "lie", "greet"].includes(state)) {
          const frame = state === "lie" ? 4 : state === "greet" ? 5 : Math.floor(cat.stride / 9) % 4;
          ctx.drawImage(cat.atlas, frame * 320, 0, 320, 256, -40, -64, 80, 64);
        } else ctx.drawImage(cat.image, -width / 2, -height, width, height);
        ctx.restore();
      }
      const blend = reduced || moving(cat) ? 1 : Math.min(1, (time - cat.transition) / 180);
      if (blend < 1) drawPose(cat.previousPose, 1 - blend);
      drawPose(cat.state, blend);
      if (cat.reactingUntil > time) {
        const progress = 1 - (cat.reactingUntil - time) / 2400;
        ctx.globalAlpha = Math.min(1, (1 - progress) * 5);
        ctx.translate(cat.x + 24, cat.y - 62 - (reduced ? 0 : progress * 24));
        ctx.scale(10, 10);
        ctx.fillStyle = "#d87c90";
        ctx.beginPath();
        ctx.moveTo(0, 0.7);
        ctx.bezierCurveTo(-1.4, -0.1, -0.8, -1.2, 0, -0.55);
        ctx.bezierCurveTo(0.8, -1.2, 1.4, -0.1, 0, 0.7);
        ctx.fill();
      }
      ctx.restore();
    },
  };
}
