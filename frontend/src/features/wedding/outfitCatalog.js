import {makeAppearance,normalizeAppearance,findPart,looks} from './catalog';
import {formalStyles,formalColors,isCoatStyle,isSkirtStyle} from './formalWear';

export const occasions=[{id:'daily',label:'日常'},{id:'formal',label:'礼仪'}];
export const clothingKeys=['shirt','sleeve','innerSleeve','pants','leg','shoes','formalStyle','formalColor','topStyle','topColor','coatStyle','coatColor','bottomStyle','bottomColor'];
export function changeClothes(appearance,patch){return normalizeAppearance({...normalizeAppearance(appearance),...patch});}
export function applyOutfit(appearance,outfit){
 const clothes=normalizeAppearance(outfit);
 return changeClothes(appearance,Object.fromEntries(clothingKeys.map(k=>[k,clothes[k]])));
}
export const topName=style=>({bridal:'婚纱上衣','bridal-lace':'蕾丝婚纱上衣',dress:'连衣裙上衣',qipao:'旗袍上衣',suit:'西装外套',tuxedo:'礼服外套',morning:'燕尾外套',waistcoat:'礼仪马甲',cardigan:'针织开衫',jacket:'休闲夹克'}[style]);
export const bottomName=style=>({bridal:'婚纱裙摆','bridal-lace':'蕾丝婚纱裙摆',dress:'礼服裙摆',qipao:'旗袍裙摆',suit:'正装西裤',tuxedo:'礼服西裤',morning:'燕尾西裤',waistcoat:'马甲配套西裤'}[style]);
export const bottomStyles=formalStyles.filter(s=>s.occasion!=='daily').map(s=>({...s,label:bottomName(s.id)}));
export const outfitPresets=[
 ...looks.map((look,i)=>({id:`daily-${i}`,label:look.name+'套装',occasion:'daily',appearance:normalizeAppearance(look.appearance)})),
 ...formalStyles.filter(s=>s.occasion!=='daily').map(style=>{
   const a={...makeAppearance(isSkirtStyle(style.id)?4:2),formalStyle:style.id,formalColor:formalColors[style.id][0].id,sleeve:style.sleeve};
   if(isCoatStyle(style.id))a.shirt=findPart('shirt','White',p=>p.name.endsWith('5')).id;
   a.shoes=`dress-shoe-${isCoatStyle(style.id)?'oxford-black':style.id.startsWith('bridal')?'stiletto-ivory':style.id==='qipao'?'ankle-strap-red':'ballet-nude'}`;
   return {id:`formal-${style.id}`,label:style.id==='tuxedo'?'新郎正装':style.id==='suit'?'西装套装':style.label,occasion:'formal',style:style.id,appearance:normalizeAppearance(a)};
 }),
];
export function outfitVariant(preset,color){
 if(!preset.style)return preset.appearance;
 return changeClothes(preset.appearance,{[isCoatStyle(preset.style)?'coatColor':'topColor']:color,bottomColor:color});
}
export function clothingSignature(value){
 const a=normalizeAppearance(value);
 return JSON.stringify([a.topStyle,a.topStyle?a.topColor:null,a.coatStyle,a.coatStyle?a.coatColor:null,a.topStyle?null:a.shirt,a.sleeve,a.bottomStyle,a.bottomColor,a.bottomStyle?null:a.pants,a.bottomStyle?null:a.leg,a.shoes]);
}
