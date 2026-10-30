<template>
 <section class="wardrobe" aria-label="我的造型" @keydown.esc="$emit('close')">
  <header><div><h2>我的造型</h2><p>{{nickname}}</p></div><button aria-label="关闭换装" @click="$emit('close')">×</button></header>
  <div class="wardrobe-summary">
   <CharacterPreview :appearance="draft" :rigid-pose="rigidPose" :rigid-bindings="rigidBindings" :circular-arm="circularArm" :left-circular-arm="leftCircularArm"/>
   <div><p>{{section==='makeup'?'先挑一张喜欢的面孔。':'挑好今天的婚礼穿搭。'}}</p><span>{{lookSummary}}</span><button class="wardrobe-reset" @click="reset">恢复默认</button></div>
  </div>
  <nav class="wardrobe-sections" aria-label="换装分类"><button :aria-pressed="section==='makeup'" @click="selectSection('makeup')">妆容</button><button :aria-pressed="section==='outfit'" @click="selectSection('outfit')">造型</button></nav>
  <nav class="wardrobe-categories" aria-label="部件分类"><button v-for="item in categories" :key="item.id" :aria-pressed="category===item.id" @click="selectCategory(item.id)">{{item.label}}</button></nav>
  <div class="wardrobe-parts">
   <nav v-if="section==='outfit'" class="occasion-tabs" aria-label="穿搭场合"><button v-for="item in occasions" :key="item.id" :aria-pressed="occasion===item.id" @click="dressCodes[category]=item.id">{{item.label}}</button></nav>
   <div v-if="category==='coat'" class="face-mode"><button aria-label="不穿外套" :aria-pressed="!draft.coatStyle" @click="updateClothes({coatStyle:null})">不穿</button></div>
   <p v-if="category==='sets'" class="accessory-note">一键搭好上衣、裤裙和鞋子，选完还可以逐件调整。</p>
   <template v-if="category==='sets'">
    <div class="face-mode"><button :aria-pressed="kitSource==='recommended'" @click="kitSource='recommended'">推荐搭配</button><button :aria-pressed="kitSource==='mine'" @click="kitSource='mine'">我的搭配 {{libraryOutfits.length}}</button></div>
    <div class="save-outfit"><input v-model="outfitName" maxlength="24" aria-label="搭配名称" placeholder="给这套搭配起个名字"><button :disabled="libraryBusy" @click="storeOutfit">{{libraryBusy?'保存中…':'保存当前搭配'}}</button></div>
    <p v-if="libraryError" class="library-error" role="alert">{{libraryError}}</p>
   </template>
   <div v-if="category==='hair'" class="face-mode"><button aria-label="没有头发" :aria-pressed="draft.hair==='none'" @click="draft.hair='none';draft.animalHead=null">没有</button></div>
   <div v-if="category==='headwear'" class="face-mode"><button aria-label="没有头饰" :aria-pressed="draft.headwear==='none'" @click="choose({id:'none'})">没有</button></div>
   <div v-if="category==='animalHead'||category==='emojiHead'" class="face-mode"><button :aria-pressed="!draft.animalHead" @click="draft.animalHead=null">使用人物头像</button></div>
   <div v-if="category==='emojiHead'" class="face-mode"><button :aria-pressed="!moreEmojis" @click="moreEmojis=false">精选 {{emojiHeads.filter(p=>p.featured).length}} 款</button><button :aria-pressed="moreEmojis" @click="moreEmojis=true">更多趣味 · 全部 {{emojiHeads.length}} 款</button></div>
   <template v-if="category==='face'">
    <div class="face-mode"><button :aria-pressed="!editingFace" @click="editingFace=false">默认搭配</button><button :aria-pressed="editingFace" @click="editingFace=true">自己搭配五官</button></div>
    <div v-if="editingFace" class="face-tabs"><button v-for="item in faceCategories" :key="item.id" :aria-pressed="faceSlot===item.id" @click="faceSlot=item.id;filterGroup=''">{{item.label}}</button></div>
   </template>
   <template v-if="category==='headwear'">
    <section v-for="group in headwearGroups" :key="group.id" class="headwear-group" :aria-label="group.label">
     <h3>{{group.label}}</h3>
     <div class="part-grid" data-slot="headwear"><button v-for="part in shown.filter(p=>p.group===group.id)" :key="part.id" :aria-label="part.label" :aria-pressed="selected(part)" @click="choose(part)"><img :src="partUrl(part)" alt="" loading="lazy"><small>{{part.label}}</small></button></div>
    </section>
    <p class="part-total">{{shown.length}} 款可选</p>
   </template>
   <template v-else-if="showParts">
    <fieldset v-if="isStyled" class="color-options"><legend>{{category==='shirt'&&draft.coatStyle?'内搭颜色':'颜色'}}</legend><button v-for="group in groups" :key="group" :aria-label="colorLabel(group)" :aria-pressed="currentPart?.group===group" @click="changeColor(group)">{{colorLabel(group)}}</button></fieldset>
    <label v-else-if="groups.length>1" class="group-filter">颜色分类<select v-model="filterGroup"><option value="">全部</option><option v-for="group in groups" :key="group" :value="group">{{groupLabel(group)}}</option></select></label>
    <fieldset v-if="category==='shirt'||category==='pants'&&occasion==='daily'" class="length-options">
     <legend>{{category==='shirt'?'袖长':'裤长'}}</legend><label v-for="length in lengths" :key="length.id"><input type="radio" :name="category+'-length'" :value="length.id" :checked="draft[category==='shirt'?'innerSleeve':'leg']===length.id" @change="chooseLength(length.id)">{{length.label}}</label>
    </fieldset>
    <div class="part-grid" :data-slot="slot"><button v-for="part in shown" :key="part.id" :aria-label="partName(part)" :title="part.name" :aria-pressed="selected(part)" @click="choose(part)">
     <FacePreview v-if="slot==='face'" :appearance="presetAppearance(draft,part)"/><img v-else :src="partUrl(part)" alt="" loading="lazy"><small>{{partName(part)}}</small>
    </button></div><p class="part-total">{{shown.length}} 款可选</p>
   </template>
   <template v-if="cards.length">
    <h3 v-if="showParts" class="clothes-heading">{{category==='shirt'?'礼仪上衣':'整套搭配'}}</h3>
    <div class="formal-grid" :data-clothes="category"><button v-for="card in cards" :key="card.id" :aria-label="card.label" :aria-pressed="cardSelected(card)" @click="chooseCard(card)">
     <ClothingPreview :appearance="cardPreview(card)" :kind="category==='sets'?'sets':category==='coat'?'coat':category==='pants'?'pants':'shirt'"/><strong>{{card.label}}</strong><small>{{card.description}}</small>
    </button></div>
   </template>
   <fieldset v-if="garmentColors.length" class="color-options garment-colors"><legend>{{category==='pants'?'裤裙配色':category==='sets'?'套装配色':category==='coat'?'外套配色':'上衣配色'}}</legend><button v-for="color in garmentColors" :key="color.id" :aria-pressed="garmentColor===color.id" @click="chooseGarmentColor(color.id)">{{color.label}}</button></fieldset>
   <button v-if="category==='sets'&&selectedKit?.savedId" class="remove-outfit" :disabled="libraryBusy" @click="$emit('remove-outfit',selectedKit.savedId)">移除这套收藏</button>
  </div>
  <footer><p v-if="error" role="alert">{{error}}</p><button :disabled="busy" @click="$emit('apply',{...draft})">{{busy?'正在穿好…':'穿好啦'}}</button></footer>
 </section>
</template>
<script setup>
import {reactive,ref,computed,watch} from 'vue';
import CharacterPreview from './CharacterPreview.vue';
import ClothingPreview from './ClothingPreview.vue';
import FacePreview from './FacePreview.vue';
import {facePresets,presetAppearance} from './faceLayouts';
import {formalStyles,formalColors,isCoatStyle} from './formalWear';
import {headwearOptions,headwearGroups} from './headwear';
import {dressShoes,dressShoeColors} from './dressShoes';
import {occasions,bottomStyles,topName,changeClothes,applyOutfit,outfitPresets,outfitVariant,clothingSignature} from './outfitCatalog';
import {byId,styledSlots,styleKey,styleLabel,styleVariant,animalHeads,emojiHeads,options,partUrl,partLabel,groupLabel,makeAppearance,normalizeAppearance} from './catalog';
const props=defineProps({rigidBindings:Object,circularArm:Object,leftCircularArm:Object,rigidPose:Object,appearance:Object,defaultAppearance:Object,nickname:String,busy:Boolean,error:String,libraryOutfits:{type:Array,default:()=>[]},libraryBusy:Boolean,libraryError:String});
const emit=defineEmits(['apply','close','preview','save-outfit','remove-outfit']);
const kitSource=ref('recommended'),outfitName=ref(''),selectedSavedId=ref(null);
const draft=reactive(normalizeAppearance(props.appearance)),section=ref('makeup'),category=ref(draft.animalHead?.startsWith('emoji-')?'emojiHead':draft.animalHead?'animalHead':'hair'),moreEmojis=ref(emojiHeads.some(p=>p.id===draft.animalHead&&!p.featured)),editingFace=ref(false),faceSlot=ref('eyes'),filterGroup=ref('');
const dressCodes=reactive({shirt:draft.topStyle||draft.coatStyle&&formalStyles.find(s=>s.id===draft.coatStyle)?.occasion!=='daily'?'formal':'daily',coat:draft.coatStyle&&formalStyles.find(s=>s.id===draft.coatStyle)?.occasion==='daily'?'daily':'formal',pants:draft.bottomStyle?'formal':'daily',shoes:byId.get(draft.shoes)?.dressShoe?'formal':'daily',sets:draft.formalStyle||draft.bottomStyle?'formal':'daily'}),lastCategory={makeup:category.value,outfit:'shirt'};
watch(draft,()=>emit('preview',{...draft}),{deep:true});
watch(()=>props.libraryOutfits.length,(n,old)=>{if(n>old){kitSource.value='mine';outfitName.value='';}});
function storeOutfit(){emit('save-outfit',{name:outfitName.value.trim()||`我的搭配 ${props.libraryOutfits.length+1}`,appearance:{...draft}});}
const savedKits=computed(()=>props.libraryOutfits.map(p=>{
 const a=normalizeAppearance(p.appearance),formal=!!a.topStyle||!!a.bottomStyle||byId.get(a.shoes)?.dressShoe||a.coatStyle&&formalStyles.find(s=>s.id===a.coatStyle)?.occasion!=='daily';
 return {id:'saved-'+p.id,savedId:p.id,label:p.name,occasion:formal?'formal':'daily',appearance:a};
}));
const categories=computed(()=>section.value==='makeup'?[
 {id:'hair',label:'发型'},{id:'headwear',label:'头饰'},{id:'face',label:'五官'},{id:'skin',label:'肤色'},{id:'emojiHead',label:'emoji'},{id:'animalHead',label:'动物'},
]:[{id:'shirt',label:'上衣'},{id:'coat',label:'外套'},{id:'pants',label:'裤子'},{id:'shoes',label:'鞋子'},{id:'sets',label:'套装'}]);
const faceCategories=[{id:'eyes',label:'眼睛'},{id:'eyebrows',label:'眉毛'},{id:'mouth',label:'嘴型'},{id:'nose',label:'鼻子'}];
const occasion=computed(()=>dressCodes[category.value]||'daily');
function selectCategory(id){category.value=id;lastCategory[section.value]=id;filterGroup.value='';}
function selectSection(id){section.value=id;selectCategory(lastCategory[id]);}
function updateClothes(patch){Object.assign(draft,changeClothes(draft,patch));}
const lookSummary=computed(()=>draft.coatStyle?`${draft.topStyle?topName(draft.topStyle):'内搭上衣'}＋${topName(draft.coatStyle)}`:draft.topStyle?topName(draft.topStyle):'每一种妆容，都能自由搭配衣服。');
const slot=computed(()=>category.value==='skin'?'head':category.value==='face'?(editingFace.value?faceSlot.value:'face'):category.value);
const showParts=computed(()=>section.value==='makeup'||category.value==='shoes'||category.value==='pants'&&occasion.value==='daily'||category.value==='shirt');
const available=computed(()=>{
 if(slot.value==='headwear')return headwearOptions.filter(p=>p.id!=='none').map(p=>({...p,name:p.label,derivedFile:`accessories/${p.id}-front.svg`}));
 if(slot.value==='face')return facePresets;
 if(slot.value==='emojiHead')return emojiHeads.filter(p=>moreEmojis.value||p.featured);
 if(slot.value==='animalHead')return animalHeads;
 if(slot.value==='shoes'&&occasion.value==='formal')return dressShoes;
 const list=options(slot.value,slot.value==='nose'?draft.skin:undefined);
 return slot.value==='shirt'&&occasion.value==='formal'?list.filter(p=>/[458]$/.test(p.name)):list;
});
const isStyled=computed(()=>styledSlots.includes(slot.value));
const currentPart=computed(()=>byId.get(draft[slot.value]));
const groups=computed(()=>['hair','shirt','pants','shoes','eyebrows'].includes(slot.value)?[...new Set(available.value.map(p=>p.group))]:[]);
const shown=computed(()=>{
 if(isStyled.value){const styles=new Map();for(const p of available.value){const key=styleKey(p);if(!styles.has(key)||p.group===currentPart.value?.group)styles.set(key,p);}return [...styles.values()];}
 return available.value.filter(p=>!filterGroup.value||!groups.value.length||p.group===filterGroup.value);
});
const lengths=computed(()=>[{id:'none',label:category.value==='shirt'?'无袖':'无裤腿'},{id:'long',label:category.value==='shirt'?'长袖':'长裤'},{id:'shorter',label:category.value==='shirt'?'短袖':'短裤'}]);
function chooseLength(id){updateClothes(category.value==='shirt'?{innerSleeve:id}:{leg:id,bottomStyle:null,bottomColor:null});}
function colorLabel(group){return slot.value==='shoes'&&occasion.value==='formal'?dressShoeColors.find(c=>c.group===group)?.label:groupLabel(group);}
function partName(p){return ['face','emojiHead','headwear'].includes(slot.value)?p.label:isStyled.value?styleLabel(p):partLabel(p);}
function changeColor(group){const variant=currentPart.value&&styleVariant(currentPart.value,group);if(variant)choose(variant);}
function selected(p){
 if(slot.value==='emojiHead')return draft.animalHead===p.id;
 if(slot.value==='shirt'&&draft.topStyle)return false;
 if(slot.value==='pants'&&draft.bottomStyle)return false;
 return slot.value==='head'?draft.skin===p.group:slot.value==='nose'?p.name.endsWith(draft.nose):draft[slot.value]===p.id;
}
function choose(p){
 if(slot.value==='shirt'){updateClothes({shirt:p.id,topStyle:null});return;}
 if(slot.value==='pants'){updateClothes({pants:p.id,bottomStyle:null,bottomColor:null});return;}
 if(slot.value==='shoes'){updateClothes({shoes:p.id});return;}
 if(slot.value==='headwear'){draft.headwear=p.id;draft.veil=p.id==='veil';return;}
 if(slot.value==='emojiHead'){draft.animalHead=p.id;return;}
 if(slot.value==='hair'||category.value==='face')draft.animalHead=null;
 if(slot.value==='face'){Object.assign(draft,presetAppearance(draft,p));return;}
 if(category.value==='face')draft.face='custom';
 if(slot.value==='head'){draft.skin=p.group;draft.face='custom';}
 else if(slot.value==='nose')draft.nose=p.name.slice(-1);
 else draft[slot.value]=p.id;
}
const cards=computed(()=>{
 if(category.value==='sets')return (kitSource.value==='mine'?savedKits.value:outfitPresets).filter(p=>p.occasion===occasion.value);
 if(category.value==='pants'&&occasion.value==='formal')return bottomStyles;
 if(category.value==='coat')return formalStyles.filter(s=>isCoatStyle(s.id)&&(s.occasion||'formal')===occasion.value).map(s=>({...s,label:topName(s.id)}));
 if(category.value==='shirt'&&occasion.value==='formal')return formalStyles.filter(s=>!isCoatStyle(s.id)).map(s=>({...s,label:topName(s.id)}));
 return [];
});
function cardPreview(card){
 if(category.value==='sets')return applyOutfit(draft,card.appearance);
 const layer=category.value==='pants'?'bottom':category.value==='coat'?'coat':'top',same=draft[layer+'Style']===card.id,color=same?draft[layer+'Color']:formalColors[card.id][0].id;
 return changeClothes(draft,{[layer+'Style']:card.id,[layer+'Color']:color,...layer==='top'?{innerSleeve:card.sleeve}:layer==='bottom'?{leg:'long'}:{}});
}
const selectedKit=computed(()=>[...savedKits.value.filter(p=>p.savedId===selectedSavedId.value),...outfitPresets,...savedKits.value].find(p=>clothingSignature(draft)===clothingSignature(p.style?outfitVariant(p,draft.formalColor):p.appearance)));
function cardSelected(card){return category.value==='sets'?selectedKit.value?.id===card.id:category.value==='pants'?draft.bottomStyle===card.id:category.value==='coat'?draft.coatStyle===card.id:draft.topStyle===card.id;}
function chooseCard(card){
 Object.assign(draft,cardPreview(card));
 selectedSavedId.value=card.savedId||null;
 if(category.value==='sets'){
  dressCodes.shirt=card.occasion;dressCodes.coat=card.occasion;dressCodes.pants=draft.bottomStyle?'formal':'daily';dressCodes.shoes=byId.get(draft.shoes)?.dressShoe?'formal':'daily';
 }
}
const garmentStyle=computed(()=>category.value==='sets'?selectedKit.value?.style:category.value==='pants'&&occasion.value==='formal'?draft.bottomStyle:category.value==='coat'?draft.coatStyle:category.value==='shirt'&&occasion.value==='formal'?draft.topStyle:null);
const garmentColors=computed(()=>formalColors[garmentStyle.value]||[]),garmentColor=computed(()=>category.value==='pants'?draft.bottomColor:category.value==='coat'?draft.coatColor:category.value==='shirt'?draft.topColor:draft.formalColor);
function chooseGarmentColor(color){
 if(category.value==='sets'&&selectedKit.value)Object.assign(draft,applyOutfit(draft,outfitVariant(selectedKit.value,color)));
 else updateClothes(category.value==='pants'?{bottomColor:color}:category.value==='coat'?{coatColor:color}:{topColor:color});
}
function reset(){Object.assign(draft,normalizeAppearance(props.defaultAppearance||makeAppearance()));section.value='makeup';selectCategory('hair');}
</script>
<style scoped>
.wardrobe {
  position: absolute;
  z-index: 5;
  right: 24px;
  top: 90px;
  bottom: 155px;
  width: 370px;
  max-height: 800px;
  display: flex;
  flex-direction: column;
  background: #fffaf3f5;
  backdrop-filter: blur(14px);
  border: 1px solid #fff;
  border-radius: 22px;
  box-shadow: 0 12px 40px #573f3429;
  overflow: hidden;
  color: #756354;
}
.wardrobe header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 18px;
}
.wardrobe h2 {
  font: 20px var(--font-display);
  margin: 0 0 4px;
}
.wardrobe header p {
  font-size: 12px;
  overflow-wrap: anywhere;
}
.wardrobe header button {
  background: none;
  color: #8b6c59;
  font-size: 25px;
  padding: 4px 9px;
  cursor: pointer;
}
.wardrobe-summary {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  padding: 0 15px 12px;
  align-items: center;
}
.wardrobe-summary :deep(canvas) {
  width: 140px;
  height: 146px;
}
.wardrobe-summary :deep(.character-preview) {
  min-height: 146px;
}
.wardrobe-summary p {
  font-size: 13px;
  line-height: 1.8;
}
.wardrobe-summary span {
  display: block;
  font-size: 11px;
  line-height: 1.7;
  color: #a28b7d;
  margin: 8px 0;
}
.wardrobe-reset {
  padding: 5px 10px;
  background: #f2e4d9;
  color: #8b6c59;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
}
.wardrobe nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  border-block: 1px solid #eaded2;
  padding: 6px;
  gap: 2px;
}
.wardrobe nav.wardrobe-sections{display:grid;grid-template-columns:1fr 1fr;padding:5px 14px;border-bottom:0;gap:6px}
.wardrobe-sections button{font-size:14px!important;font-weight:600;padding:10px!important}
.wardrobe nav.wardrobe-categories{justify-content:flex-start;padding:5px 14px;gap:4px}
.wardrobe-categories button{flex:1;white-space:nowrap}
.bottom-mode button{padding:9px 12px;border:1px solid #d9c4ae;border-radius:10px;background:#f3e8dc;color:#795d50;cursor:pointer}
.bottom-mode p{font-size:11px;line-height:1.6;color:#9b8270;margin:8px 0 15px}
.clothing-mode{display:grid!important;grid-template-columns:1fr 1fr}
.wardrobe nav.occasion-tabs{display:grid;grid-template-columns:1fr 1fr;border:0;padding:4px;background:#f2e9df;border-radius:12px;margin-bottom:14px;gap:4px}
.occasion-tabs button{font-weight:600;padding:9px!important}.occasion-tabs button[aria-pressed=true]{background:#fffaf5!important;box-shadow:0 2px 6px #73503b10}
.save-outfit{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;margin-bottom:14px}.save-outfit input{min-width:0;padding:8px;border:1px solid #dfcaba;border-radius:8px;background:#fffcf8;font:inherit;font-size:11px;color:#795d50}.save-outfit button,.remove-outfit{border:1px solid #dfcaba;background:#eee0d1;color:#795d50;padding:8px;border-radius:8px;font-size:11px;cursor:pointer}.remove-outfit{margin-top:10px;background:#faf1eb}.library-error{font-size:11px;color:#a45151}
.wear-modes{display:flex;gap:6px;margin-bottom:12px}.wear-modes button{flex:1;padding:8px;background:#faf4ec;color:#8b6c59;border:1px solid #e7d8c9;border-radius:9px;cursor:pointer}
.layer-tabs{border-bottom:1px solid #e8dacc;padding-bottom:8px}.layer-tabs button{flex:1}.clothes-heading{font-size:12px;font-weight:600;margin:17px 0 10px;color:#8b6c59}.garment-colors{margin-top:14px}
.accessory-note{font-size:11px;line-height:1.6;color:#9b8270;margin:0 0 12px}.headwear-group+.headwear-group{margin-top:16px}.headwear-group h3{font-size:12px;font-weight:500;color:#947b66;margin:0 0 8px}
.wardrobe nav button,
.color-options button,
.face-mode button,
.face-tabs button {
  padding: 8px 7px;
  background: none;
  color: #8b6c59;
  font-size: 12px;
  cursor: pointer;
  border-radius: 10px;
}
.wardrobe button[aria-pressed="true"] {
  background: #edd9cb;
  color: #674938;
}
.wardrobe-parts {
  overflow: auto;
  min-height: 0;
  flex: 1;
  padding: 12px 14px;
  overscroll-behavior: contain;
}
.color-options {
  border: 0;
  padding: 0 0 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
}
.color-options legend { margin-bottom: 6px; }
.formal-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px; }
.formal-grid > button { min-width:0;padding:8px;border:1px solid #dfcaba;border-radius:14px;background:#f5eade;color:#795d50;cursor:pointer; }
.formal-grid :deep(canvas) { width:120px;height:126px;max-width:100%; }
.formal-grid :deep(.character-preview) { min-height:130px; }
.formal-grid strong,.formal-grid small { display:block;margin-top:7px; }
.formal-grid small { font-size:10px;line-height:1.5; }
.group-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 12px;
}
.group-filter select {
  font: inherit;
  background: #fffaf3;
  border: 1px solid #dfcaba;
  border-radius: 8px;
  padding: 5px 8px;
  color: #795d50;
  max-width: 160px;
}
.length-options {
  border: 0;
  padding: 0 0 12px;
  display: flex;
  gap: 14px;
  font-size: 12px;
}
.length-options legend {
  margin-bottom: 8px;
}
.length-options input {
  accent-color: #ad7d66;
  margin-right: 4px;
}
.part-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}
.part-grid button {
  border: 1px solid #e8dbce;
  background: #eee5d9;
  border-radius: 11px;
  padding: 7px 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  min-width: 0;
  color: #907463;
}
.part-grid img {
  width: 50px;
  height: 54px;
  object-fit: contain;
}
.part-grid canvas { width:60px;height:68px;max-width:100%; }
.part-grid small {
  font-size: 9px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.part-grid button[aria-pressed="true"] {
  border-color: #b78269;
}
.part-total {
  font-size: 10px;
  text-align: right;
  color: #a38e80;
  margin-top: 10px;
}
.face-mode,
.face-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
}
.wardrobe footer {
  padding: 12px 18px;
  border-top: 1px solid #eaded2;
}
.wardrobe footer button {
  display: block;
  width: 100%;
  padding: 10px;
  background: #b58670;
  color: white;
  border-radius: 18px;
  cursor: pointer;
}
.wardrobe footer p {
  font-size: 12px;
  color: #a44949;
  margin-bottom: 8px;
}
.wardrobe button:focus-visible {
  outline: 2px solid #b58670;
  outline-offset: 2px;
}
@media (max-width: 600px) {
  .wardrobe {
    left: 12px;
    right: 12px;
    width: auto;
    top: 75px;
    bottom: 18px;
  }
  .wardrobe-summary {
    grid-template-columns: 110px 1fr;
  }
  .wardrobe-summary :deep(canvas) {
    width: 110px;
    height: 115px;
  }
  .wardrobe-summary :deep(.character-preview) {
    min-height: 115px;
  }
}
@media (max-height: 600px) {
  .wardrobe {
    top: 12px;
    bottom: 12px;
  }
  .wardrobe-summary {
    display: none;
  }
}
</style>
