import request from "../../utils/request";
import { createCatLife, moving } from "./catLife";
import {loadOriginalImages} from './originalArt';

export async function loadCats({ signal } = {}) {
  const { data } = await request.get("/wedding/cats", { signal });
  const ids = ["liuyi", "anan", "guagua", "huahua", "heihei"];
  if (!Array.isArray(data.cats) || data.cats.length !== 5 ||
      !ids.every((id) => data.cats.some((cat) => cat.id === id))) throw new Error("Invalid cat configuration");
  const life = createCatLife(data.cats);
  let disposed=false,pendingActions=null;
  const attemptedActions=new Set();
  async function imageAt(url) {
    signal?.throwIfAborted();
    const image=new Image();image.decoding='async';image.src=url;
    const abort=()=>{image.src='';};signal?.addEventListener('abort',abort,{once:true});
    try{await image.decode();signal?.throwIfAborted();return image;}
    finally{signal?.removeEventListener('abort',abort);}
  }
  const images = await Promise.all(life.cats.map(async (cat) => {
    return {image:await imageAt(`/wedding/cats/${cat.id}.webp`)};
  }));
  const cats = life.cats;
  cats.forEach((cat, i) => Object.assign(cat, images[i]));
  const heart=(await loadOriginalImages(['heart'])).get('heart');
  return {
    ...life,
    cats,
    needsActions(isVisible){return !pendingActions&&cats.some(cat=>!cat.atlas&&!attemptedActions.has(cat.id)&&isVisible(cat));},
    update(dt,time,actors,player,reduced){return life.update(dt,time,actors,player,reduced,cat=>!!cat.atlas);},
    loadActions({onReady=()=>{},isVisible=()=>true}={}) {
      if(pendingActions)return pendingActions;
      pendingActions=(async()=>{
        const queue=cats.filter(cat=>!cat.atlas&&!attemptedActions.has(cat.id)&&isVisible(cat));
        for(const cat of queue){
          if(disposed||signal?.aborted)break;
          if(!isVisible(cat))continue;
          attemptedActions.add(cat.id);
          try{
            const atlas=await imageAt(`/wedding/cats/${cat.id}-actions.webp`);
            if(disposed||signal?.aborted)break;
            cat.atlas=atlas;onReady(cat);
          }catch{if(disposed||signal?.aborted)break;}
        }
      })().finally(()=>{pendingActions=null;});
      return pendingActions;
    },
    dispose(){disposed=true;},
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
        if (cat.atlas && ["walk", "trot", "lie", "greet"].includes(state)) {
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
        const width=20,height=width*heart.naturalHeight/heart.naturalWidth;
        ctx.drawImage(heart,-width/2,-height/2,width,height);
      }
      ctx.restore();
    },
  };
}
