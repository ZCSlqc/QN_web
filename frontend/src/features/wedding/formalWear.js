export const formalStyles = [
  { id:'cardigan',label:'针织开衫',description:'开襟 · 小纽扣 · 休闲叠穿',sleeve:'long',occasion:'daily' },
  { id:'jacket',label:'休闲夹克',description:'立领 · 拉链 · 翻盖口袋',sleeve:'long',occasion:'daily' },
  { id: "bridal", label: "白色婚纱", description: "心形胸线 · 珍珠腰饰 · 长裙摆", sleeve:'none', veil:true },
  { id: "bridal-lace", label: "蕾丝婚纱", description: "花边圆领 · 花瓣腰饰 · 叠层裙摆", sleeve:'shorter', veil:true },
  { id: "tuxedo", label: "新郎礼服", description: "尖翻领 · 领结 · 胸花", sleeve:'long' },
  { id: "morning", label: "燕尾礼服", description: "长燕尾 · 双排扣 · 浅色马甲", sleeve:'long' },
  { id: "suit", label: "修身西装", description: "窄翻领 · 双纽扣 · 配套西裤", sleeve:'long' },
  { id: "waistcoat", label: "马甲套装", description: "白衬衣 · V领马甲 · 怀表链", sleeve:'long' },
  { id: "dress", label: "经典连衣裙", description: "圆领 · 蝴蝶结 · 色块百褶", sleeve:'none' },
  { id: "qipao", label: "花扣旗袍", description: "立领 · 盘扣 · 小花饰", sleeve:'shorter' },
];
export const formalColors = {
  cardigan:[
    {id:'oat',label:'燕麦',base:'#c7b397',dark:'#a28c6f',light:'#e6d8c1',accent:'#786d5d'},
    {id:'sage',label:'鼠尾草绿',base:'#819583',dark:'#526c58',light:'#b2c1a8',accent:'#e1d5ac'},
    {id:'rose',label:'豆沙粉',base:'#c7989c',dark:'#a17179',light:'#e9c5c3',accent:'#f6e8d2'},
  ],
  jacket:[
    {id:'blue',label:'牛仔蓝',base:'#597d9b',dark:'#35536e',light:'#8aabc2',accent:'#d7ba83'},
    {id:'sand',label:'沙色',base:'#c5b08a',dark:'#928064',light:'#e5d4b5',accent:'#75634e'},
    {id:'olive',label:'橄榄绿',base:'#788367',dark:'#505e46',light:'#abb398',accent:'#dbc69e'},
  ],
  bridal:[
    {id:'white',label:'纯白',base:'#fffdfb',dark:'#dce1e6',light:'#ffffff',accent:'#cdb98f'},
    {id:'ivory',label:'象牙白',base:'#fff5e6',dark:'#e4d7c2',light:'#fffcf4',accent:'#c4a974'},
    {id:'blush',label:'浅粉白',base:'#fff1f1',dark:'#e7ced4',light:'#fffafb',accent:'#b99b9c'},
  ],
  'bridal-lace':[
    {id:'white',label:'纯白',base:'#fffdfb',dark:'#dce1e6',light:'#ffffff',accent:'#d9c7a7'},
    {id:'pearl',label:'珍珠白',base:'#f6f5fa',dark:'#d6d5e2',light:'#ffffff',accent:'#b6a7c4'},
    {id:'cream',label:'奶油白',base:'#fff7e9',dark:'#e7dac4',light:'#ffffff',accent:'#c6ad82'},
  ],
  morning:[
    {id:'black',label:'经典黑',base:'#30353e',dark:'#191f28',light:'#67727f',accent:'#b7a17c'},
    {id:'slate',label:'雾蓝灰',base:'#60758a',dark:'#394e64',light:'#9cacbb',accent:'#d2bd93'},
    {id:'ivory',label:'象牙白',base:'#eee5d6',dark:'#b9ab94',light:'#fffaf0',accent:'#8c765c'},
  ],
  waistcoat:[
    {id:'sage',label:'鼠尾草绿',base:'#778d7c',dark:'#485e50',light:'#a6b6a6',accent:'#d1b677'},
    {id:'camel',label:'驼棕',base:'#b69b7b',dark:'#78644f',light:'#d6c2a6',accent:'#eee1bd'},
    {id:'navy',label:'藏青',base:'#3d566e',dark:'#26394c',light:'#6d8599',accent:'#d1bc8d'},
  ],
  suit: [
    { id: "navy", label: "藏青", light: "#526b86", base: "#2f455f", dark: "#192b40", accent: "#c99c83" },
    { id: "charcoal", label: "炭灰", light: "#777c84", base: "#454b55", dark: "#272d35", accent: "#bca3c5" },
    { id: "ivory", label: "米白", light: "#fff8e9", base: "#dbcfb8", dark: "#a99b85", accent: "#738d84" },
  ],
  dress: [
    { id: "champagne", label: "香槟", light: "#fff1d3", base: "#dec299", dark: "#ae8465", accent: "#f8e7bf" },
    { id: "rose", label: "雾粉", light: "#ffe1e1", base: "#dba4b0", dark: "#a56980", accent: "#f5d5cc" },
    { id: "blue", label: "浅蓝", light: "#e1f2fb", base: "#9dbdce", dark: "#63879f", accent: "#e4edf3" },
  ],
  tuxedo:[
    {id:'midnight',label:'午夜蓝',base:'#283448',dark:'#121d2e',light:'#4a5b72',accent:'#c8a76b'},
    {id:'ivory',label:'象牙白',base:'#eadfc9',dark:'#a99b85',light:'#fff8e9',accent:'#475c64'},
    {id:'wine',label:'酒红',base:'#713a4b',dark:'#482330',light:'#92576b',accent:'#dfbf7c'},
  ],
  qipao:[
    {id:'red',label:'朱红',base:'#a83f43',dark:'#752a36',light:'#d16a62',accent:'#e7c581'},
    {id:'jade',label:'玉绿',base:'#53877b',dark:'#315c54',light:'#80ac94',accent:'#e3d4a2'},
    {id:'navy',label:'青蓝',base:'#415c7a',dark:'#293f5a',light:'#6c89a0',accent:'#d9c590'},
  ],
};
export const isSkirtStyle=style=>['dress','qipao','bridal','bridal-lace'].includes(style);
export const isSuitStyle=style=>['suit','tuxedo','morning','waistcoat'].includes(style);
export const isCoatStyle=style=>isSuitStyle(style)||['cardigan','jacket'].includes(style);
export function paletteFor(style,color){return formalColors[style]?.find(p=>p.id===color)||formalColors[style]?.[0];}
export const formalTextureKey=a=>JSON.stringify([a.topStyle,a.topColor,a.coatStyle,a.coatColor,a.bottomStyle,a.bottomColor,a.sleeve,a.shirt,a.pants,a.leg]);
export function formalPalette(a) {
  return formalColors[a.formalStyle]?.find(p => p.id === a.formalColor)
    || formalColors[a.formalStyle]?.[0];
}
function shape(c, path, fill, stroke) {
  const p = new Path2D(path);
  c.fillStyle = fill; c.fill(p);
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(p); }
}
// Recolour the original alpha silhouette; never redraw the shoulder/hip fit.
export function flatTexture(source, color) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width; canvas.height = source.height;
  const c = canvas.getContext("2d"); c.drawImage(source, 0, 0);
  c.globalCompositeOperation = "source-in";
  c.fillStyle = color; c.fillRect(0, 0, canvas.width, canvas.height);
  c.globalCompositeOperation='source-over';
  return canvas;
}
export function formalSleeve(p, source, style) {
  return flatTexture(source, style==='waistcoat'?'#fffaf1':p.base);
}
export function formalTop(source,a,back){
  const p=formalPalette(a),suited=isSuitStyle(a.formalStyle);
  const canvas=flatTexture(source,p.base),c=canvas.getContext('2d');
  if(isCoatStyle(a.formalStyle)){c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(source,0,0);}
  if(suited&&!back){
    c.save();c.translate(canvas.width/2,348);
    if(a.formalStyle==='suit')shape(c,'M-7 -324 L7 -324 L5 -308 L10 -266 L0 -255 L-10 -266 L-5 -308Z',p.accent);
    c.strokeStyle=p.dark;c.lineWidth=1.5;c.beginPath();c.moveTo(0,-310);c.lineTo(0,-180);c.stroke();
    c.restore();c.globalCompositeOperation='destination-in';c.drawImage(source,0,0);
    c.globalCompositeOperation='source-over';
  }
  return canvas;
}
// Outerwear and skirts are independent original-SVG-derived assets.
export function drawFormalBody(c,a,back,stride,top){c.drawImage(top,-top.width/2,-348);}
