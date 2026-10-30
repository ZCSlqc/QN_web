import parts from "./parts.json";
import formalTemplates from "./formalTemplates.json";
import { facePresets, presetAppearance } from "./faceLayouts";
import { animalHeads } from "./animalHeads";
import emojiHeads from "./emojiHeads.json";
export { default as emojiHeads } from "./emojiHeads.json";
const specialHeads = [...animalHeads, ...emojiHeads];
import { formalColors, isSuitStyle, isCoatStyle, isSkirtStyle } from "./formalWear";
import {dressShoes} from './dressShoes';
import {headwearOptions} from './headwear';
export { animalHeads } from "./animalHeads";

export const byId = new Map([...parts,...dressShoes].map((part) => [part.id, part]));
export const allParts = parts;
export const partUrl = (part) => {
  const p = typeof part === "string" ? byId.get(part) : part;
  if(p.derivedFile)return `/wedding/kenney_modular-characters/Derived/${p.derivedFile}`;
  if (p.formalTemplate) return `/wedding/kenney_modular-characters/Derived/templates/${p.file}`;
  if (p.slot === "emojiHead") return `/wedding/emoji/${p.file}`;
  if (p.slot === "animalHead") return `/wedding/pixelAnimal/${p.file}`;
  return `/wedding/kenney_modular-characters/PNG/${p.original}`;
};
export function options(slot, group) {
  return parts.filter((p) => p.slot === slot && (!group || p.group === group));
}
export function findPart(slot, group, test = () => true) {
  return parts.find((p) => p.slot === slot && p.group === group && test(p));
}
const named = (name) => parts.find((p) => p.name === name)?.id;
const colors = {
  Black: "黑色",
  Blonde: "金色",
  "Brown 1": "浅棕",
  "Brown 2": "深棕",
  Grey: "灰色",
  Red: "红色",
  Tan: "米棕",
  White: "白色",
  Blue: "蓝色",
  "Blue 1": "浅蓝",
  "Blue 2": "深蓝",
  Green: "绿色",
  "Light Blue": "天蓝",
  Navy: "藏青",
  Pine: "松绿",
  Yellow: "黄色",
  Brown: "棕色",
  Completes: "整套",
  Eyes: "瞳色",
  Mouth: "表情",
  Eyebrows: "眉形",
};
export function groupLabel(group) {
  return colors[group] || group.replace("Tint ", "肤色 ");
}
export const styledSlots = ["hair", "shirt", "pants", "shoes"];
export function styleKey(part) {
  if(part.dressShoe)return `dress-shoe-${part.style}`;
  const n = Number(part.name.match(/(\d)$/)?.[1]);
  if (part.slot === "hair") {
    if (part.name.includes("Man")) return `short-${n}`;
    // The source pack numbers identical long styles differently by colour.
    const order = part.group === "Black" ? [1, 2, 3, 4, 5, 6]
      : part.group === "Tan" ? [2, 3, 5, 4, 1, 6]
      : [2, 3, 4, 1, 6, 5];
    return `long-${order[n - 1]}`;
  }
  return `${part.slot}-${n}`;
}
export function styleLabel(part) {
  if(part.dressShoe)return part.label;
  const [kind, n] = styleKey(part).split("-");
  return `${{ short: "短发", long: "长发", shirt: "上衣", pants: "裤装", shoes: "鞋子" }[kind]} ${n}`;
}
export function styleVariant(part, group) {
  if(part.dressShoe)return dressShoes.find(p=>p.style===part.style&&p.group===group);
  return options(part.slot, group).find((p) => styleKey(p) === styleKey(part));
}
export function hairAnchor(part) {
  if (part.name.includes("Man")) {
    return { x: part.name.endsWith("5") ? -79 : -part.width / 2,
      y: -411 - part.height };
  }
  return { x: -part.width / 2, y: -530 };
}
export function partLabel(part) {
  if (part.slot === "animalHead") return part.label;
  const number = part.name.match(/(\d+)$/)?.[1];
  if (part.slot === "hair")
    return `${groupLabel(part.group)}${part.name.includes("Woman") ? "长/短发" : "短发"} ${number}`;
  const titles = {
    shirt: "上衣",
    pants: "裤腰",
    shoes: "鞋子",
    face: "表情",
    eyes: "眼睛",
    eyebrows: "眉毛",
    mouth: "嘴型",
    nose: "鼻子",
  };
  if (part.slot === "head") return groupLabel(part.group);
  return `${titles[part.slot] || "部件"} · ${groupLabel(part.group)} · ${number || part.name.split("_").pop()}`;
}
export function makeAppearance(index = 0) {
  const hair = [
    "blackMan1",
    "brown2Man5",
    "blackMan2",
    "brown1Woman1",
    "blackWoman3",
    "redWoman5",
  ][index % 6];
  const shirt = [
    "blueShirt5",
    "redShirt3",
    "greenShirt6",
    "pineShirt4",
    "whiteShirt8",
    "greyShirt1",
  ][index % 6];
  return {
    animalHead: null,
    formalStyle: null,
    formalColor: "navy",
    matchedBottom: true,
    veil: false,
    headwear:'none',
    skin: "Tint 1",
    hair: named(hair),
    shirt: named(shirt),
    sleeve: "long",
    pants: named("pantsNavy3"),
    leg: "long",
    shoes: named("blackShoe1"),
    face: named("face1"),
    faceLayout: "face-completes-face1",
    eyes: named("eyeBrown_large"),
    eyebrows: named("blackBrow1"),
    mouth: named("mouth_happy"),
    nose: "1",
  };
}
export const looks = [
  "蓝色衬衫",
  "暖红衬衫",
  "绿色衬衫",
  "松绿上衣",
  "白色上衣",
  "灰色上衣",
].map((name, index) => ({ name, appearance: makeAppearance(index) }));
export function normalizeAppearance(value) {
  let result = { ...makeAppearance(), ...value };
  const preset = facePresets.find(p => p.id === result.face);
  if (preset) result = presetAppearance(result, preset);
  if (!facePresets.some(p => p.id === result.faceLayout)) result.faceLayout = facePresets[0].id;
  if (!formalColors[result.formalStyle]) result.formalStyle = null;
  result.headwear=headwearOptions.some(p=>p.id===value?.headwear)&&value.headwear!=='none'?value.headwear:value?.veil===true?'veil':'none';
  result.veil=result.headwear==='veil';
  result.matchedBottom=result.matchedBottom!==false;
  if (result.formalStyle && !formalColors[result.formalStyle].some(p => p.id === result.formalColor))
    result.formalColor = formalColors[result.formalStyle][0].id;
  if(!Object.hasOwn(value||{},'topStyle')&&!Object.hasOwn(value||{},'coatStyle')){
    result.topStyle=result.formalStyle&&!isCoatStyle(result.formalStyle)?result.formalStyle:null;
    result.coatStyle=isCoatStyle(result.formalStyle)?result.formalStyle:null;
    result.topColor=result.coatColor=result.formalColor;
  }
  if(!formalColors[result.topStyle]||isCoatStyle(result.topStyle))result.topStyle=null;
  if(!isCoatStyle(result.coatStyle))result.coatStyle=null;
  for(const layer of ['top','coat'])if(result[layer+'Style']&&!formalColors[result[layer+'Style']].some(p=>p.id===result[layer+'Color']))result[layer+'Color']=formalColors[result[layer+'Style']][0].id;
  result.formalStyle=result.coatStyle||result.topStyle||null;
  result.formalColor=result.coatStyle?result.coatColor:result.topStyle?result.topColor:result.formalColor;
  // Old v3 saves coupled the lower garment to the top. New saves name it explicitly.
  if(!Object.hasOwn(value||{},'bottomStyle')){
    result.bottomStyle=result.matchedBottom&&(isSuitStyle(result.formalStyle)||isSkirtStyle(result.formalStyle))?result.formalStyle:null;
    result.bottomColor=result.formalColor;
  }
  if(!isSuitStyle(result.bottomStyle)&&!isSkirtStyle(result.bottomStyle))result.bottomStyle=null;
  if(result.bottomStyle&&!formalColors[result.bottomStyle].some(p=>p.id===result.bottomColor))result.bottomColor=formalColors[result.bottomStyle][0].id;
  if(!result.bottomStyle)result.bottomColor=null;
  result.matchedBottom=!!result.bottomStyle&&result.bottomStyle===result.formalStyle&&result.bottomColor===result.formalColor;
  if (!specialHeads.some((p) => p.id === result.animalHead)) result.animalHead = null;
  if (!options("head", result.skin).length) result.skin = "Tint 1";
  for (const slot of [
    "hair",
    "shirt",
    "pants",
    "shoes",
    "eyes",
    "eyebrows",
    "mouth",
  ]) {
    if(slot==='hair'&&result.hair==='none')continue;
    if (byId.get(result[slot])?.slot !== slot)
      result[slot] = makeAppearance()[slot];
  }
  if (result.face !== "custom" && byId.get(result.face)?.slot !== "face")
    result.face = named("face1");
  if(result.sleeve==="short")result.sleeve="shorter";
  if (!["long", "shorter", "none"].includes(result.sleeve))
    result.sleeve = "long";
  if(!['long','shorter','none'].includes(result.innerSleeve))result.innerSleeve=result.sleeve;
  result.sleeve=result.coatStyle?'long':result.innerSleeve;
  if(result.leg==="short")result.leg="shorter";
  if (!["long", "shorter", "none"].includes(result.leg)) result.leg = "long";
  if (!["1", "2", "3"].includes(result.nose)) result.nose = "1";
  return result;
}
export function resolveParts(appearance) {
  const a = normalizeAppearance(appearance);
  const selectedHead = specialHeads.find(p => p.id === a.animalHead) || null;
  const template = name => formalTemplates.find(p => p.file === `${name}.svg`);
  const derived=(file,width,height)=>({id:'derived-'+file,derivedFile:file,width,height,slot:'layer'});
  const armPrefix=a.skin.toLowerCase().replaceAll(' ','-'),sleevePrefix=a.formalStyle?`formal-${a.formalStyle}-${a.formalColor}`:`sleeve-${byId.get(a.shirt).group.toLowerCase()}`;
  const garment=a.coatStyle?`formal/${a.coatStyle}-${a.coatColor}`:null,top=a.topStyle?`formal/${a.topStyle}-${a.topColor}`:null,bottom=a.bottomStyle?`formal/${a.bottomStyle}-${a.bottomColor}`:null;
  const shirt = a.topStyle ? template("shirt") : byId.get(a.shirt),
    pants = bottom ? template("pants") : byId.get(a.pants);
  return {
    animalHead: selectedHead,
    animalBack: selectedHead?.backFile ? {
      id: `${selectedHead.slot}-${selectedHead.backFile}`, slot: selectedHead.slot,
      file: selectedHead.backFile,
    } : null,
    head: findPart("head", a.skin),
    neck: findPart("neck", a.skin),
    hand: findPart("hand", a.skin),
    arm: findPart("arm", a.skin),
    armUpper:derived(`rig/${armPrefix}-upper.svg`,170,136),
    armLower:derived(`rig/${armPrefix}-lower.svg`,170,136),
    sleeveUpper:a.sleeve==='long'?derived(`rig/${sleevePrefix}-upper.svg`,171,142):null,
    sleeveLower:a.sleeve==='long'?derived(`rig/${sleevePrefix}-lower.svg`,171,142):null,
    outerFront:garment?derived(`${garment}-outer-front.svg`,200,300):null,
    outerBack:garment?derived(`${garment}-outer-back.svg`,200,300):null,
    topFront:top?derived(`${top}-outer-front.svg`,200,300):null,
    topBack:top?derived(`${top}-outer-back.svg`,200,300):null,
    veilBack:a.veil?derived('accessories/veil-back.svg',280,390):null,
    veilFront:a.veil?derived('accessories/veil-front.svg',280,390):null,
    headwearFront:!['none','veil'].includes(a.headwear)?derived(`accessories/${a.headwear}-front.svg`,280,180):null,
    headwearBack:!['none','veil'].includes(a.headwear)?derived(`accessories/${a.headwear}-back.svg`,280,180):null,
    skirtFront:bottom&&isSkirtStyle(a.bottomStyle)?derived(`${bottom}-skirt-front.svg`,300,210):null,
    skirtBack:bottom&&isSkirtStyle(a.bottomStyle)?derived(`${bottom}-skirt-back.svg`,300,210):null,
    skinLeg: findPart("leg", a.skin),
    hair: a.hair==='none'?null:byId.get(a.hair),
    shirt,
    sleeve: a.formalStyle ? template(a.sleeve==='shorter'?"sleeve-shorter":"sleeve-long") : findPart("sleeve", shirt.group, (p) =>
      p.name.endsWith("_" + (a.sleeve === "none" ? "long" : a.sleeve)),
    ),
    pants,
    leg: bottom ? template("leg") : findPart(
      "leg",
      pants.group,
      (p) => p.original.startsWith("Pants/") && p.name.endsWith("_" + (a.leg === "none" ? "long" : a.leg)),
    ),
    shoes: byId.get(a.shoes),
    eyes: byId.get(a.eyes),
    eyebrows: byId.get(a.eyebrows),
    mouth: byId.get(a.mouth),
    nose: findPart("nose", a.skin, (p) => p.name.endsWith(a.nose)),
  };
}
