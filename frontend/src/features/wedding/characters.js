import { drawFace } from "./faceLayouts";
import { normalizeRig } from "./rig";
import { normalizePose, normalizeBindings, fixedHandAngle, rigidSide, drawRigidArm, waistTransform, upperBodyDrop, headNeckExtraDrop } from "./rigidRig";
import legAttachment from './legAttachment.json';
import { drawCircularArm, circularHandFrame } from './circularArm';
import { heldPlacement } from './heldItems';
import { forearmPass } from './armOcclusion';
import { characterMotion } from './motions';
import { looks, normalizeAppearance, resolveParts, partUrl, hairAnchor } from "./catalog";
import { formalPalette, formalSleeve, formalTop, flatTexture, drawFormalBody, isSkirtStyle, isSuitStyle, isCoatStyle, paletteFor, formalTextureKey } from "./formalWear";
export { looks } from "./catalog";
export const CHARACTER_SCALE = 0.25;
export const ANIMAL_HEAD_BOTTOM = -355;
const decodedAssets=new Map();
function decodeAsset(url){
  if(decodedAssets.has(url)){const pending=decodedAssets.get(url);decodedAssets.delete(url);decodedAssets.set(url,pending);return pending;}
  const image=new Image();image.decoding='async';image.src=url;
  const pending=image.decode().then(()=>image).catch(error=>{if(decodedAssets.get(url)===pending)decodedAssets.delete(url);throw error;});
  decodedAssets.set(url,pending);if(decodedAssets.size>160)decodedAssets.delete(decodedAssets.keys().next().value);
  return pending;
}
const clothingSlots=new Set(['shirt','pants','leg','sleeve','sleeveUpper','sleeveLower','outerFront','topFront','skirtFront','shoes']);

function visibleBounds(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width; canvas.height = image.height;
  const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  let left=image.width, top=image.height, right=-1, bottom=-1;
  for(let y=0;y<image.height;y++) for(let x=0;x<image.width;x++) {
    if(pixels[(y*image.width+x)*4+3] <= 8) continue;
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
  }
  if(right<left) throw new Error("Empty head image");
  return {left,top,width:right-left+1,height:bottom-top+1};
}

// Native Kenney pixels: head -> neck -> shirt -> waist -> paired legs/shoes.
// All PNG parts use one scale; shorter sleeves/trousers reveal matching skin parts.
export function clapPose(elapsed, reduced = false) {
  const openness = reduced
    ? 0
    : (1 + Math.cos(Math.max(0, elapsed) * Math.PI * 4)) / 2;
  return {
    handX: 30.5 + 34.5 * openness,
    handY: -260,
    contact: openness < 0.08,
  };
}
function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
// Two connected bones keep hands on the supplied part's wrist anchors.
// Native sleeve/skin artwork is cached in a rounded segment, avoiding warped flippers.
function armMesh(
  ctx,
  texture,
  shoulder,
  elbow,
  wrist,
  side,
  length = 1,
  width = 38,
  layer = "all",
) {
  const along = (t) =>
    t <= 0.5 ? lerp(shoulder, elbow, t * 2) : lerp(elbow, wrist, (t - 0.5) * 2);
  function bone(a, b) {
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    if (distance < 0.01) return;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2);
    ctx.drawImage(texture, -width / 2, -width / 2, width, distance + width);
    ctx.restore();
  }
  if (layer !== "front") bone(shoulder, along(Math.min(length, 0.5)));
  if (layer !== "back" && length > 0.5) bone(elbow, along(length));
}
function boneTexture(image) {
  const source = document.createElement("canvas");
  source.width = image.width;
  source.height = image.height;
  const sc = source.getContext("2d");
  sc.drawImage(image, 0, 0);
  const pixels = sc.getImageData(0, 0, source.width, source.height).data,
    colors = new Map();
  for (let i = 0; i < pixels.length; i += 4)
    if (pixels[i + 3] > 240) {
      const color = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`;
      colors.set(color, (colors.get(color) || 0) + 1);
    }
  const color =
    [...colors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "220,190,150";
  const result = document.createElement("canvas");
  result.width = 64;
  result.height = 192;
  const ctx = result.getContext("2d");
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.roundRect(0, 0, 64, 192, 32);
  ctx.fill();
  ctx.globalCompositeOperation = "source-atop";
  ctx.drawImage(image, 0, 0, 64, 192);
  return result;
}
// The pack supplies front artwork only. Keep its silhouette and base fabric
// colour for the reverse, without copying collars, buttons or front pockets.
function reverseClothing(image, shirt) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const colors = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 240) continue;
    const color = `rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`;
    colors.set(color, (colors.get(color) || 0) + 1);
  }
  const color = [...colors].sort((a, b) => b[1] - a[1])[0][0];
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  if (shirt) {
    // A shallow back neckline replaces the deep front neckline.
    ctx.beginPath();
    ctx.moveTo(22, 3);
    ctx.quadraticCurveTo(canvas.width / 2, 16, canvas.width - 22, 3);
    ctx.lineTo(canvas.width - 22, 45);
    ctx.lineTo(22, 45);
    ctx.fill();
  } else {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "#00000018";
    ctx.fillRect(0, 0, canvas.width, 9);
    ctx.restore();
  }
  return canvas;
}
export async function loadCharacters() {
  const images = new Map(),
    pending = new Map(),
    resolved = new Map(),
    hairColors = new Map(),
    bones = new Map(),
    reverse = new Map(),
    animalArt = new Map(),
    formalTextures = new Map();
  const heldImages=new Map(),heldPending=new Map();
  let disposed = false;
  async function load(part) {
    if (!part) return;
    if (images.has(part.id)) return;
    if (!pending.has(part.id)) {
      pending.set(
        part.id,
        decodeAsset(partUrl(part))
          .then(img => {
            if (!disposed) images.set(part.id, img);
          })
          .finally(() => pending.delete(part.id)),
      );
    }
    return pending.get(part.id);
  }
  async function ensureAppearance(value,clothesOnly=false) {
    const a = normalizeAppearance(value),
      parts = resolveParts(a),
      key = JSON.stringify(a);
    await Promise.all(Object.entries(parts).filter(([slot,p])=>p&&(!clothesOnly||clothingSlots.has(slot))).map(([,p])=>load(p)));
    if (!disposed) {
      resolved.set(key, parts);
      if (!clothesOnly&&parts.animalHead && !animalArt.has(parts.animalHead.id)) {
        const p = parts.animalHead, img = images.get(p.id);
        const fixedFrame = p.slot === "emojiHead";
        const frontBounds = fixedFrame ? {left:0,top:0,width:p.width,height:p.height} : visibleBounds(img);
        const faceWidth = p.id === "animal-monkey" ? 320 : p.id === "animal-rabbit" ? 310 : frontBounds.width;
        const scale = fixedFrame ? 180 / p.contentSize : 180 / faceWidth;
        const backImage = images.get(parts.animalBack.id);
        const backBounds = fixedFrame ? frontBounds : visibleBounds(backImage);
        // Ordinary emoji share a round rear sprite; the six special heads keep
        // their own silhouettes. Every rear is anchored to the same head bottom.
        const backScale = fixedFrame
          ? scale
          : Math.min(frontBounds.width * scale / backBounds.width, frontBounds.height * scale / backBounds.height);
        animalArt.set(p.id, { ...frontBounds, back: backImage, scale, backBounds, backScale,
          anchorY: fixedFrame ? p.anchor.y : null });
      }
      for (const slot of ["shirt", "pants"])
        if (!reverse.has(parts[slot].id))
          reverse.set(parts[slot].id, reverseClothing(images.get(parts[slot].id), slot === "shirt"));
      for (const part of [parts.arm, parts.sleeve])
        if (images.has(part.id)&&!bones.has(part.id))
          bones.set(part.id, boneTexture(images.get(part.id)));
      if (a.formalStyle||a.bottomStyle) {
        const palette = formalPalette(a),topPalette=paletteFor(a.topStyle,a.topColor),bottomPalette=paletteFor(a.bottomStyle,a.bottomColor),key=formalTextureKey(a);
        if (!formalTextures.has(key)) formalTextures.set(key, {
          sleeve: palette?formalSleeve(palette, bones.get(parts.sleeve.id),a.formalStyle):bones.get(parts.sleeve.id),
          rigidSleeve: palette?formalSleeve(palette,images.get(parts.sleeve.id),a.formalStyle):images.get(parts.sleeve.id),
          front: topPalette?flatTexture(images.get(parts.shirt.id),topPalette.base):palette?formalTop(images.get(parts.shirt.id), a, false):images.get(parts.shirt.id),
          back: topPalette?flatTexture(reverse.get(parts.shirt.id),topPalette.base):palette?formalTop(reverse.get(parts.shirt.id), a, true):reverse.get(parts.shirt.id),
          leg: bottomPalette?flatTexture(images.get(parts.leg.id), isSuitStyle(a.bottomStyle)?bottomPalette.dark:bottomPalette.base):images.get(parts.leg.id),
          pants: bottomPalette?flatTexture(images.get(parts.pants.id), isSkirtStyle(a.bottomStyle)?bottomPalette.base:bottomPalette.dark):images.get(parts.pants.id),
        });
      }
      if (parts.hair&&images.has(parts.hair.id)&&!hairColors.has(parts.hair.id)) {
        const sample = document.createElement("canvas");
        sample.width = 1;
        sample.height = 1;
        const sc = sample.getContext("2d"),
          hair = images.get(parts.hair.id);
        sc.drawImage(hair, -Math.floor(hair.width / 2), -10);
        const pixel = sc.getImageData(0, 0, 1, 1).data;
        hairColors.set(
          parts.hair.id,
          pixel[3] > 100
            ? `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`
            : "#393938",
        );
      }
    }
    return a;
  }
  async function ensureHeldItem(item){
    if(!item||heldImages.has(item.id))return;
    if(!heldPending.has(item.id)){
      heldPending.set(item.id,decodeAsset(item.image).then(image=>{if(!disposed)heldImages.set(item.id,image);}).finally(()=>heldPending.delete(item.id)));
    }
    await heldPending.get(item.id);
  }
  function draw(ctx, actor, time, reduced) {
    const motionFrame=actor.rigidPose?null:characterMotion(actor,time,reduced);
    if(motionFrame)actor={...actor,...motionFrame};
    const rigid = actor.rigidPose ? {...normalizePose(),...actor.rigidPose} : null;
    const bindings = normalizeBindings(actor.rigidBindings);
    const rig = normalizeRig(actor.rig);
    const appearance = actor.appearance || looks[actor.look || 0].appearance;
    const a = normalizeAppearance(appearance),
      parts = resolved.get(JSON.stringify(a));
    if (!parts) return;
    const elapsed = Math.max(0, time - (actor.gestureStarted || 0)),
      dance = actor.gesture === "dance" && !reduced && !motionFrame;
    const stride =
      actor.walking && !reduced
        ? Math.sin(time * 9)
        : dance
          ? Math.sin(elapsed * 7) * 0.6
          : 0;
    const back = actor.direction === "back",
      clapping = actor.gesture === "clap",
      blessing = actor.gesture === "bless";
    const formal = a.formalStyle;
    const dressedBottom=!!a.bottomStyle,suited=isSuitStyle(a.bottomStyle),skirt=isSkirtStyle(a.bottomStyle);
    const pantsAnchor=legAttachment.pants[dressedBottom?"long":a.leg]||legAttachment.pants.long;
    const tailored = formalTextures.get(formalTextureKey(a));
    function part(key, x, y, mirror = false) {
      const p = parts[key];
      if (!p) return;
      ctx.save();
      ctx.translate(x, y);
      if (mirror) ctx.scale(-1, 1);
      ctx.drawImage(back && reverse.has(p.id) ? reverse.get(p.id) : images.get(p.id), 0, 0);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(actor.x, actor.y);
    ctx.scale(CHARACTER_SCALE, CHARACTER_SCALE);
    ctx.fillStyle = "#5e4c3433";
    ctx.beginPath();
    ctx.ellipse(actor.bodyOffset?.x||0, -2, 100*(actor.shadowScale||1), 22*(actor.shadowScale||1), 0, 0, 7);
    ctx.fill();
    if (actor.player) {
      ctx.strokeStyle = "#66876dbb";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, -2, 108, 27, 0, 0, 7);
      ctx.stroke();
    }
    ctx.translate(actor.bodyOffset?.x||0,(actor.bodyOffset?.y||0)-(actor.lift||0));
    // A forced rear forearm must precede the entire figure, including legs.
    function upperBodyTransform(){
      if(rigid){const w=waistTransform(rigid,bindings);ctx.translate(w.pivot.x,w.pivot.y);ctx.rotate(w.angle);ctx.translate(-w.pivot.x,-w.pivot.y);ctx.translate(0,upperBodyDrop);}
      if(dance){ctx.translate(Math.sin(elapsed*7)*7,-Math.abs(Math.sin(elapsed*7))*6);ctx.rotate(Math.sin(elapsed*3.5)*.055);}
    }
    function drawHeld(){
      const item=actor.holding&&actor.heldItem,image=item&&heldImages.get(item.id);
      if(!image||!actor.circularArm?.enabled)return;
      const left=circularHandFrame(rigid,bindings,actor.leftCircularArm,-1).palm,right=circularHandFrame(rigid,bindings,actor.circularArm,1).palm;
      const placement=heldPlacement(item,image,left,right);
      ctx.save();
      if(placement.mirrored){ctx.translate(2*placement.grip.x,0);ctx.scale(-1,1);}
      ctx.drawImage(image,placement.x,placement.y,placement.width,placement.height);
      ctx.restore();
    }
    if(rigid){ctx.save();upperBodyTransform();if(back)drawHeld();drawArms('behind');ctx.restore();}
    for (const side of [-1, 1]) {
      ctx.save();
      const fixed = rigid ? rigidSide(rigid, side, bindings) : null;
      const hip = fixed ? fixed.hip : rig[side < 0 ? "leftHip" : "rightHip"];
      const ankle = rig[side < 0 ? "leftAnkle" : "rightAnkle"];
      ctx.translate(hip.x, hip.y);
      ctx.rotate(fixed ? fixed.legAngle : side * 0.12 + stride * side * 0.09);
      // Each leg is mirrored from the original single-leg component.
      if (side < 0) ctx.scale(-1, 1);
      // Both upper-leg centres attach at the hip; the source leg already
      // curves outwards. The shoe ankle (not the image edge) meets the shin.
      // Skin first, shoe above skin, trouser hem above shoe.
      if (!suited) part("skinLeg", fixed ? -fixed.leg.sx : -31, fixed ? -fixed.leg.sy : -3);
      if (fixed) {
        ctx.save();ctx.translate(fixed.shoe.x-fixed.leg.sx,fixed.shoe.y-fixed.leg.sy);ctx.rotate(-.12+rigid[fixed.prefix+'Shoe']*Math.PI/180);
        const shoeAnchor=parts.shoes.anchor||legAttachment.shoes[Number(parts.shoes.name.match(/(\d+)$/)?.[1])||1];part("shoes",-shoeAnchor.x,-shoeAnchor.y);ctx.restore();
      } else part("shoes", ankle.x - 36, ankle.y);
      ctx.save();if(fixed)ctx.rotate(-3*Math.PI/180);
      if (suited) ctx.drawImage(tailored.leg, fixed ? -pantsAnchor.x : -40, fixed ? -pantsAnchor.y : -3);
      else {
        if (!skirt && a.leg!=="none") part("leg", fixed ? -pantsAnchor.x : -40, fixed ? -pantsAnchor.y : -3);
      }
      ctx.restore();
      ctx.restore();
    }
    if(skirt)part(back?'skirtBack':'skirtFront',-150,-190);
    ctx.save();upperBodyTransform();
    if(parts.veilBack){
      ctx.save();ctx.translate(bindings.head.x,bindings.head.y+headNeckExtraDrop);ctx.rotate(rigid.head*Math.PI/180);ctx.translate(-bindings.head.sx,-bindings.head.sy);part('veilBack',-140,-530);ctx.restore();
    }
    function drawArms(layer) {
    if (rigid) {
      for (const side of [-1,1]) {
        const r=rigidSide(rigid,side,bindings);
        const armConfig=side<0?actor.leftCircularArm:actor.circularArm;
        if(armConfig?.enabled){
          if(layer!=='back'&&layer!==forearmPass(armConfig,actor.direction))continue;
          drawCircularArm(ctx,r,rigid,{...armConfig,longSleeve:a.sleeve==='long'}, {
            arm:images.get(parts.arm.id),armUpper:images.get(parts.armUpper.id),armLower:images.get(parts.armLower.id),hand:images.get(parts.hand.id),sleeve:a.sleeve==='none'?null:formal?tailored.rigidSleeve:images.get(parts.sleeve.id),sleeveUpper:images.get(parts.sleeveUpper?.id),sleeveLower:images.get(parts.sleeveLower?.id)
          },layer==='back'?'back':'front');
          continue;
        }
        if(layer==='behind'||layer==='above')continue;
        if(layer==='front') {
          // Isolate the hand above the torso, while the unchanged full sleeve
          // masks its root. This is compositing only, not a split arm asset.
          const handCanvas=document.createElement('canvas');
          handCanvas.width=parts.hand.width;handCanvas.height=parts.hand.height;
          const hc=handCanvas.getContext('2d');hc.drawImage(images.get(parts.hand.id),0,0);
          hc.globalCompositeOperation='destination-out';hc.save();
          hc.translate(r.hand.sx,r.hand.sy);hc.rotate(-r.armAngle-fixedHandAngle*Math.PI/180);hc.scale(side,1);hc.translate(-r.wrist.x,-r.wrist.y);
          if(a.sleeve!=='none')drawRigidArm(hc,formal?tailored.rigidSleeve:images.get(parts.sleeve.id),r,true);hc.restore();
          handCanvas.dataset.rigLayer='hand';
          ctx.save();ctx.translate(r.wrist.x,r.wrist.y);ctx.scale(side,1);ctx.rotate(r.armAngle+fixedHandAngle*Math.PI/180);
          ctx.drawImage(handCanvas,-r.hand.sx,-r.hand.sy);ctx.restore();
          continue;
        }
        // One complete original curved arm; no elbow, clipping or stretching.
        drawRigidArm(ctx,images.get(parts.arm.id),r);
        ctx.save();ctx.translate(r.wrist.x,r.wrist.y);ctx.scale(side,1);
        ctx.rotate(r.armAngle+fixedHandAngle*Math.PI/180);
        part('hand',-r.hand.sx,-r.hand.sy);ctx.restore();
        if(a.sleeve!=='none')drawRigidArm(ctx,formal ? tailored.rigidSleeve : images.get(parts.sleeve.id),r,true);
      }
      return;
    }
    if(layer==='behind'||layer==='above')return;
    for (const side of [-1, 1]) {
      // Anchor inside the original shirt's sloping shoulder. The sleeve cap
      // extends half its width above this joint, so the joint must sit lower
      // than the visible shoulder edge (shirt top is y=-348).
      const prefix = side < 0 ? "left" : "right";
      const shoulder = rig[`${prefix}Shoulder`];
      let elbow = { x: rig[`${prefix}Elbow`].x + stride * 8, y: rig[`${prefix}Elbow`].y },
        wrist = {
          x: rig[`${prefix}Wrist`].x + stride * 15,
          y: rig[`${prefix}Wrist`].y + stride * side * 14,
        };
      if (clapping) {
        const pose = clapPose(elapsed, reduced);
        elbow = { x: side * 110, y: -226 };
        wrist = { x: side * pose.handX, y: pose.handY };
      }
      if (dance) {
        elbow = { x: side * 118, y: -300 };
        wrist = { x: side * 150, y: -350 + Math.sin(elapsed * 7 + side) * 25 };
      }
      if (blessing) {
        elbow = { x: side * 105, y: -238 };
        wrist = {
          x: side * 35,
          y:
            -280 -
            (reduced
              ? 0
              : Math.sin((Math.min(1, elapsed / 0.7) * Math.PI) / 2) * 25),
        };
      }
      armMesh(ctx, bones.get(parts.arm.id), shoulder, elbow, wrist, side, 1, 38, layer);
      if(a.sleeve!=='none')armMesh(
        ctx,
        formal ? tailored.sleeve : bones.get(parts.sleeve.id),
        shoulder,
        elbow,
        wrist,
        side,
        formal ? (formal === "suit" ? 1 : 0.37) : { long: 1, short: 0.65, shorter: 0.37 }[a.sleeve],
        44,
        layer,
      );
      if (layer === "front") part(
        "hand",
        wrist.x - parts.hand.width / 2,
        wrist.y - parts.hand.height / 2,
      );
    }
    }
    // Upper sleeves sit behind the shirt; forearms and hands cross in front.
    drawArms("back");
    // Neck covers upper sleeves; the shirt collar and head cover the neck.
    if(rigid)part("neck",bindings.neck.x-bindings.neck.sx-parts.neck.width/2,bindings.neck.y-bindings.neck.sy+headNeckExtraDrop);
    else part("neck",rig.neck.x-parts.neck.width/2,rig.neck.y);
    if (formal) {
      if (!rigid || formal === "dress") drawFormalBody(ctx, a, back, stride, back ? tailored.back : tailored.front, rigid ? {...waistTransform(rigid,bindings),upperDrop:upperBodyDrop} : null);
      else ctx.drawImage(back?tailored.back:tailored.front,-parts.shirt.width/2,-348);
    } else part("shirt", -parts.shirt.width / 2, -348);
    if(a.topStyle)part(back?'topBack':'topFront',-100,-360);
    // Waistband is above the shirt hem and stays attached to the lower body.
    {
      ctx.save();
      if(rigid){ctx.translate(0,-upperBodyDrop);const w=waistTransform(rigid,bindings);ctx.translate(w.pivot.x,w.pivot.y);ctx.rotate(-w.angle);ctx.translate(-w.pivot.x,-w.pivot.y);}
      const x=rigid?bindings.waist.x-bindings.waist.sx:-parts.pants.width/2;
      const y=rigid?bindings.waist.y-bindings.waist.sy:-190;
      if(dressedBottom)ctx.drawImage(tailored.pants,x,y);
      else part("pants",x,y);
      ctx.restore();
    }
    // Independent outerwear covers the waistband while the inner shirt stays put.
    if(isCoatStyle(formal))part(back?'outerBack':'outerFront',-100,-360);
    if (back) drawArms("front");
    ctx.save();
    if(rigid){ctx.translate(bindings.head.x,bindings.head.y+headNeckExtraDrop);ctx.rotate(rigid.head*Math.PI/180);ctx.translate(-bindings.head.sx,-bindings.head.sy);}
    if (parts.animalHead) {
      const p = parts.animalHead, art = animalArt.get(p.id);
      ctx.save();
      ctx.imageSmoothingEnabled = p.slot === "emojiHead";
      const bounds = back ? art.backBounds : art, scale = back ? art.backScale : art.scale;
      ctx.drawImage(back ? art.back : images.get(p.id), bounds.left, bounds.top, bounds.width, bounds.height,
        -bounds.width * scale / 2, ANIMAL_HEAD_BOTTOM - (art.anchorY ?? bounds.height) * scale,
        bounds.width * scale, bounds.height * scale);
      ctx.restore();
    } else {
    part("head", -parts.head.width / 2, -510);
    if (!back) {
      const offset =
        actor.direction === "left" ? -8 : actor.direction === "right" ? 8 : 0;
      ctx.save();
      ctx.translate(offset, 0);
      drawFace(ctx, images, parts, a, actor.facePose);
      ctx.restore();
    } else if (parts.hair&&!parts.hair.name.endsWith("Man8")) {
      ctx.fillStyle = hairColors.get(parts.hair.id);
      ctx.beginPath();
      ctx.ellipse(0, -437, 76, 72, 0, 0, 7);
      ctx.fill();
    }
    // Shared hair anchor; long hair keeps its original length, never squashed into a cap.
    if(parts.hair){const anchor = hairAnchor(parts.hair);part("hair", anchor.x, anchor.y);}
    }
    if(parts.veilFront)part('veilFront',-140,-530);
    if(parts.headwearFront)part(back?'headwearBack':'headwearFront',-140,-610);
    ctx.restore();
    // Front view: head/hair/features behind the foreground arm and hand.
    if (!back) drawArms("front");
    if(!back)drawHeld();
    // Explicit foreground wins over head, hair, and automatically placed arms.
    drawArms('above');
    ctx.restore();
    ctx.restore();
  }
  function drawClothes(ctx,value,kind='sets'){
    const a=normalizeAppearance(value),parts=resolved.get(JSON.stringify(a));if(!parts)return false;
    const tailored=formalTextures.get(formalTextureKey(a)),frame=characterMotion({},0,true),pose=frame.rigidPose,bindings=frame.rigidBindings;
    const image=key=>parts[key]&&images.get(parts[key].id),skirt=isSkirtStyle(a.bottomStyle),suited=isSuitStyle(a.bottomStyle),bottom=!!a.bottomStyle;
    if(kind==='shoes'){ctx.drawImage(image('shoes'),0,0);return true;}
    if(kind==='sets'||kind==='pants'){
      for(const side of [-1,1]){
        const r=rigidSide(pose,side,bindings),anchor=legAttachment.pants[bottom?'long':a.leg]||legAttachment.pants.long;
        ctx.save();ctx.translate(r.hip.x,r.hip.y);ctx.rotate(r.legAngle);if(side<0)ctx.scale(-1,1);
        if(kind==='sets'){
          const shoeAnchor=parts.shoes.anchor||legAttachment.shoes[Number(parts.shoes.name.match(/(\d+)$/)?.[1])||1];
          ctx.save();ctx.translate(r.shoe.x-r.leg.sx,r.shoe.y-r.leg.sy);ctx.rotate(-.12);ctx.drawImage(image('shoes'),-shoeAnchor.x,-shoeAnchor.y);ctx.restore();
        }
        if(!skirt&&(bottom||a.leg!=='none')){ctx.rotate(-3*Math.PI/180);ctx.drawImage(suited?tailored.leg:image('leg'),-anchor.x,-anchor.y);}
        ctx.restore();
      }
      if(skirt)ctx.drawImage(image('skirtFront'),-150,-190);
    }
    if(kind==='sets'||kind==='shirt'||kind==='coat'){
      ctx.save();ctx.translate(0,upperBodyDrop);
      for(const side of [-1,1]){
        const r=rigidSide(pose,side,bindings),config=side<0?frame.leftCircularArm:frame.circularArm;
        const assets={sleeve:a.sleeve==='none'?null:a.formalStyle?tailored.rigidSleeve:image('sleeve'),sleeveUpper:image('sleeveUpper'),sleeveLower:image('sleeveLower')};
        for(const pass of ['back','front'])drawCircularArm(ctx,r,pose,{...config,longSleeve:a.sleeve==='long',clothesOnly:true},assets,pass);
      }
      if(kind!=='coat'){
        ctx.drawImage(a.formalStyle?tailored.front:image('shirt'),-parts.shirt.width/2,-348);
        if(a.topStyle)ctx.drawImage(image('topFront'),-100,-360);
      }
      ctx.restore();
    }
    if(kind==='sets'||kind==='pants')ctx.drawImage(bottom?tailored.pants:image('pants'),bindings.waist.x-bindings.waist.sx,bindings.waist.y-bindings.waist.sy);
    if((kind==='sets'||kind==='coat')&&a.coatStyle){ctx.save();ctx.translate(0,upperBodyDrop);ctx.drawImage(image('outerFront'),-100,-360);ctx.restore();}
    return true;
  }
  return {
    ensureAppearance,
    ensureClothesAppearance:value=>ensureAppearance(value,true),
    ensureHeldItem,
    draw,
    drawClothes,
    dispose() {
      disposed = true;
      images.clear();
      pending.clear();
      resolved.clear();
      hairColors.clear();
      bones.clear();
      reverse.clear();
      animalArt.clear();
      formalTextures.clear();
      heldImages.clear();heldPending.clear();
    },
  };
}
