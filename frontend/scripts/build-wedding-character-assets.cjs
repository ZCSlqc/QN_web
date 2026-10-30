const { writeAsset, copyAsset } = require('./asset-files.cjs');
// Original Kenney geometry, uniform source scale, separate wearable layers.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'asset/wedding/kenney_modular-characters'),out=path.join(base,'Derived'),published=path.join(root,'frontend/public/wedding/kenney_modular-characters/Derived');
const paths=require('../src/features/wedding/armJointPaths.json'),joint=require('../src/features/wedding/armCircle.json'),attachment=require('../src/features/wedding/armAttachment.json'),parts=require('../src/features/wedding/parts.json');
const palettes={
 cardigan:{oat:['#c7b397','#a28c6f','#e6d8c1','#786d5d'],sage:['#819583','#526c58','#b2c1a8','#e1d5ac'],rose:['#c7989c','#a17179','#e9c5c3','#f6e8d2']},
 jacket:{blue:['#597d9b','#35536e','#8aabc2','#d7ba83'],sand:['#c5b08a','#928064','#e5d4b5','#75634e'],olive:['#788367','#505e46','#abb398','#dbc69e']},
 bridal:{white:['#fffdfb','#dce1e6','#ffffff','#cdb98f'],ivory:['#fff5e6','#e4d7c2','#fffcf4','#c4a974'],blush:['#fff1f1','#e7ced4','#fffafb','#b99b9c']},
 'bridal-lace':{white:['#fffdfb','#dce1e6','#ffffff','#d9c7a7'],pearl:['#f6f5fa','#d6d5e2','#ffffff','#b6a7c4'],cream:['#fff7e9','#e7dac4','#ffffff','#c6ad82']},
 morning:{black:['#30353e','#191f28','#67727f','#b7a17c'],slate:['#60758a','#394e64','#9cacbb','#d2bd93'],ivory:['#eee5d6','#b9ab94','#fffaf0','#8c765c']},
 waistcoat:{sage:['#778d7c','#485e50','#a6b6a6','#d1b677'],camel:['#b69b7b','#78644f','#d6c2a6','#eee1bd'],navy:['#3d566e','#26394c','#6d8599','#d1bc8d']},
 suit:{navy:['#2f455f','#192b40','#526b86','#c99c83'],charcoal:['#454b55','#272d35','#777c84','#bca3c5'],ivory:['#dbcfb8','#a99b85','#fff8e9','#738d84']},
 tuxedo:{midnight:['#283448','#121d2e','#4a5b72','#c8a76b'],ivory:['#eadfc9','#a99b85','#fff8e9','#475c64'],wine:['#713a4b','#482330','#92576b','#dfbf7c']},
 dress:{champagne:['#dec299','#ae8465','#fff1d3','#f8e7bf'],rose:['#dba4b0','#a56980','#ffe1e1','#f5d5cc'],blue:['#9dbdce','#63879f','#e1f2fb','#e4edf3']},
 qipao:{red:['#a83f43','#752a36','#d16a62','#e7c581'],jade:['#53877b','#315c54','#80ac94','#e3d4a2'],navy:['#415c7a','#293f5a','#6c89a0','#d9c590']}
};
const catalog={license:'Kenney CC0',sources:['Vector/vector_shirts.svg','Vector/vector_skin.svg','Vector/vector_pants.svg'],joint,assets:[]};
function write(file,svg,source){const dest=path.join(out,file),web=path.join(published,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.mkdirSync(path.dirname(web),{recursive:true});writeAsset(dest,svg);copyAsset(dest,web);catalog.assets.push({file:`Derived/${file}`,source});}
const svg=(w,h,viewBox,content)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}"><!-- Derived from original Kenney modular SVG geometry. No nonuniform scaling. -->${content}</svg>\n`;
function half(cx,cy,side){const a=joint.cut*Math.PI/180,n={x:Math.cos(a),y:Math.sin(a)},t={x:-n.y,y:n.x};return `M${cx-t.x*700} ${cy-t.y*700} L${cx+t.x*700} ${cy+t.y*700} L${cx+t.x*700+side*n.x*1400} ${cy+t.y*700+side*n.y*1400} L${cx-t.x*700+side*n.x*1400} ${cy-t.y*700+side*n.y*1400}Z`;}
function split(w,h,body,cx,cy,radius,color,side){return svg(w,h,`0 0 ${w} ${h}`,`<defs><clipPath id="cut"><path d="${half(cx,cy,side)}"/><circle cx="${cx}" cy="${cy}" r="${radius}"/></clipPath></defs><circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}"/><g clip-path="url(#cut)">${body}</g>`);}
async function colors(original){const {data}=await sharp(path.join(base,'PNG',original)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),counts=new Map();for(let i=0;i<data.length;i+=4)if(data[i+3]===255){const c='#'+[data[i],data[i+1],data[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');counts.set(c,(counts.get(c)||0)+1);}return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,3).map(p=>p[0]);}
const lum=c=>parseInt(c.slice(1,3),16)*.2126+parseInt(c.slice(3,5),16)*.7152+parseInt(c.slice(5,7),16)*.0722;
const pth=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const dx=attachment.sleeveTop.x-attachment.armTop.x,dy=attachment.sleeveTop.y-attachment.armTop.y;
function sleeveBody(p){return `<g transform="scale(3) translate(-278.07663 -25.35)">${paths.sleeve.map(x=>pth(x.d,x.fill==='#D2D2D2'?p[1]:x.fill==='#EEEEEE'?p[0]:p[2])).join('')}</g>`;}
function sleeves(prefix,p){for(const side of [-1,1])write(`rig/${prefix}-${side<0?'upper':'lower'}.svg`,split(171,142,sleeveBody(p),joint.sleeve.x+dx,joint.sleeve.y+dy,joint.sleeve.radius,p[0],side),'vector_shirts.svg paths 7,8,9; sleeve inscribed circle; diameter collinear with skin circle');}
function original(file){return fs.readFileSync(path.join(root,'asset/wedding/custom/formal',file),'utf8').replace(/<\?xml[^>]*>/g,'');}
const shirt=original('shirt.svg'),waist=original('pants.svg');
function nested(source,x,y,fill){return `<g style="fill:${fill}">${source.replace('<svg ',`<svg x="${x}" y="${y}" `).replace(/fill="#[0-9a-f]+"/gi,`fill="${fill}"`)}</g>`;}
function floral(p,x,y,size=1){return `<g transform="translate(${x} ${y}) scale(${size})">${[0,60,120,180,240,300].map(a=>`<ellipse cx="0" cy="-5" rx="3" ry="5" fill="${p[3]}" transform="rotate(${a})"/>`).join('')}<circle r="3" fill="${p[2]}"/></g>`;}
function pearls(x,y,n,gap,fill,r=2){return Array.from({length:n},(_,i)=>`<circle cx="${x+i*gap}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');}
function clothing(style,p,back){
 const [base,dark,light,accent]=p,shape=nested(shirt,-76.5,-348,base);
 let body=shape,detail='';
 if(style==='cardigan'||style==='jacket'){
  body+=pth('M-70 -185 H70 L72 -145 H-72Z',base);
  const opening=style==='cardigan'?'M-34 -349 H34 L8 -255 L9 -140 H-9 L-8 -255Z':'M-27 -349 H27 L10 -320 H-10Z';
  body=`<defs><mask id="open"><rect x="-100" y="-360" width="200" height="300" fill="white"/>${pth(opening,'black')}</mask></defs><g mask="url(#open)">${body}</g>`;
  if(back)detail=pth('M-67 -169 H67 V-148 H-67Z',dark);
  else if(style==='cardigan'){
   detail=pth('M-35 -345 L-11 -254 V-149 M35 -345 L11 -254 V-149','none',`stroke="${light}" stroke-width="5"`)+pth('M-58 -221 H-26 V-196 H-58Z M26 -221 H58 V-196 H26Z',dark);
   for(const y of [-246,-222,-198,-174])detail+=`<circle cx="12" cy="${y}" r="2.5" fill="${accent}"/>`;
  }else detail=pth('M-25 -344 L-41 -326 L-16 -313 L-8 -324 M25 -344 L41 -326 L16 -313 L8 -324',dark)+pth('M0 -321 V-147','none',`stroke="${accent}" stroke-width="2"`)+pth('M-60 -243 H-23 V-222 H-60Z M23 -243 H60 V-222 H23Z',light)+`<rect x="-3" y="-313" width="6" height="10" rx="2" fill="${accent}"/>`;
 }else if(['suit','tuxedo','morning','waistcoat'].includes(style)){
  const vest=style==='waistcoat',tails=style==='morning';
  body+=pth(tails?'M-70 -183 H70 L72 -77 L20 -66 L0 -128 L-20 -66 L-72 -77Z':'M-70 -183 H70 L71 -133 L18 -130 L0 -142 L-18 -130 L-71 -133Z',base);
  if(!back)body=`<defs><mask id="open"><rect x="-100" y="-360" width="200" height="300" fill="white"/>${pth(vest?'M-100 -360 H100 V-330 L47 -321 L17 -259 L0 -247 L-17 -259 L-47 -321 L-100 -330Z':'M-40 -349 H40 L21 -247 L24 -126 H-24 L-21 -247Z','black')}</mask></defs><g mask="url(#open)">${body}</g>`;
  if(back)detail=pth(tails?'M0 -320 V-131 M-7 -127 L-18 -74 M7 -127 L18 -74':'M0 -320 V-145','none',`stroke="${dark}" stroke-width="2"`)+pth('M-27 -201 H27 V-194 H-27Z',dark);
  else{
   if(!vest)for(const s of [-1,1])detail+=`<g transform="scale(${s} 1)">${pth(style==='tuxedo'?'M28 -345 L57 -327 L35 -308 L48 -309 L5 -241 L17 -299Z':'M29 -345 L51 -328 L36 -308 L45 -298 L5 -242 L18 -296Z',style==='suit'?light:dark)}${pth('M34 -218 H61 V-213 H34Z',dark)}</g>`;
   if(tails)detail+=pth('M-17 -307 H17 L23 -192 L0 -178 L-23 -192Z','#d8d7cf')+pth('M-11 -316 L0 -304 L11 -316 L4 -287 L0 -281 L-4 -287Z',accent);
   if(vest)detail+=pth('M-46 -319 L0 -248 L46 -319 L36 -316 L0 -259 L-36 -316Z',dark)+pth('M20 -222 Q40 -202 56 -229','none',`stroke="${accent}" stroke-width="2"`);
   for(const y of vest?[-241,-217,-193,-170]:[-226,-204])detail+=`<circle cx="${vest?0:12}" cy="${y}" r="2.6" fill="${accent}"/>`;
   detail+=pth('M35 -282 H57 L54 -275 H39Z','#fffaf2');
   if(!vest)detail+=floral(['#fffaf1',dark,'#d2a987','#f6e7d1'],48,-264,.55)+pth('M47 -257 L44 -244','none','stroke="#7f927b" stroke-width="2"');
   if(style==='tuxedo')detail+=pth('M-17 -323 L0 -316 L17 -323 L17 -307 L0 -313 L-17 -307Z',dark)+`<circle cx="0" cy="-315" r="3" fill="${accent}"/>`;
  }
 }else if(style==='bridal'||style==='bridal-lace'){
  const lace=style==='bridal-lace';
  body+=pth('M-71 -187 H71 L75 -153 Q0 -142 -75 -153Z',base);
  detail=pth('M-66 -296 Q-58 -246 -68 -194 L-53 -192 Q-48 -240 -53 -280Z',dark)+pth('M66 -296 Q58 -246 68 -194 L53 -192 Q48 -240 53 -280Z',dark);
  detail+=pth(lace?'M-46 -338 Q0 -311 46 -338':'M-43 -309 Q-24 -326 0 -304 Q24 -326 43 -309','none',`stroke="${dark}" stroke-width="3" stroke-linecap="round"`);
  detail+=pth('M-72 -190 Q0 -179 72 -190 V-180 Q0 -167 -72 -180Z',accent)+pearls(-60,-184,13,10,light,2.1);
  if(lace){for(let i=-2;i<=2;i++)detail+=floral([base,dark,light,dark],i*17,-327+Math.cos(i*.55)*9,.45);detail+=floral([base,dark,light,light],-34,-181,.6);}
  else detail+=floral([base,dark,light,light],0,-182,.65);
  if(back)detail=pth('M-40 -334 Q0 -292 40 -334','none',`stroke="${dark}" stroke-width="3"`)+pearls(0,-304,1,0,accent)+[-285,-271,-257,-243,-229].map(y=>`<circle cx="0" cy="${y}" r="2" fill="${dark}"/>`).join('')+pth('M-70 -190 H70 V-179 H-70Z',accent)+pth('M0 -184 Q-34 -206 -29 -178 Q-15 -165 0 -184 Q34 -206 29 -178 Q15 -165 0 -184',light);
 }else if(style==='qipao'){
  detail=pth('M-27 -345 Q0 -326 27 -345 L25 -332 Q0 -313 -25 -332Z',dark);
  if(!back){detail+=pth('M18 -331 Q50 -319 47 -289 L19 -270 V-190','none',`stroke="${accent}" stroke-width="3" stroke-linejoin="round"`);for(const y of [-317,-301,-283])detail+=pth(`M31 ${y}q10 -5 15 0q-7 6 -15 0`,accent);detail+=floral(p,-42,-233,.8)+floral(p,46,-194,.65);}
  else detail+=pth('M0 -318 V-184','none',`stroke="${dark}" stroke-width="1.5"`);
  body+=pth('M-71 -187 H71 L74 -130 H-74Z',base);
 }else{
  body+=pth('M-71 -187 H71 L76 -132 H-76Z',base);
  detail=pth('M-43 -347 Q0 -312 43 -347 L39 -334 Q0 -301 -39 -334Z',light)+pth('M-73 -188 H73 V-170 H-73Z',accent);
  detail+=back?pth('M0 -180 Q-28 -202 -25 -178 Q-12 -168 0 -180 Q28 -202 25 -178 Q12 -168 0 -180',light):floral(p,0,-180,.9);
 }
 return svg(200,300,'-100 -360 200 300',body+detail);
}
function skirt(style,p,back){
 const [base,dark,light,accent]=p;
 if(style==='bridal'||style==='bridal-lace'){
  const lace=style==='bridal-lace';
  let content=pth('M-72 -183 H72 Q91 -104 143 -8 Q77 13 0 9 Q-77 13 -143 -8 Q-91 -104 -72 -183Z',base)+nested(waist,-76.5,-190,base);
  content+=pth('M-58 -169 L-40 -169 L-72 6 Q-95 3 -119 -2Z',dark)+pth('M40 -169 H50 L108 2 L85 7Z',dark)+pth('M-23 -171 H-12 L-27 8 L-48 8Z',light)+pth('M8 -171 H20 L52 8 L23 9Z',light);
  if(lace){content+=pth('M-73 -171 H73 Q84 -134 101 -99 Q70 -79 0 -76 Q-70 -79 -101 -99Z',light)+pth('M-101 -99 Q0 -65 101 -99','none',`stroke="${dark}" stroke-width="2"`);for(let x=-84;x<=84;x+=21)content+=floral([base,dark,light,dark],x,-88+8*(1-Math.abs(x)/100),.35);}
  content+=pth('M-139 -10 Q0 15 139 -10','none',`stroke="${light}" stroke-width="5" stroke-linecap="round"`);
  for(let x=-120;x<=120;x+=16)content+=`<circle cx="${x}" cy="${3-9*Math.pow(x/140,2)}" r="2" fill="${accent}"/>`;
  if(back)content+=pth('M-9 -170 L-28 -46 L-4 -53 L0 -73 L9 -49 L28 -44 L9 -170Z',light);
  return svg(300,210,'-150 -190 300 210',content);
 }
 let body=pth(style==='qipao'?'M-72 -183 H72 Q80 -117 82 -33 L17 -26 L10 -72 L0 -31 L-82 -33 Q-80 -117 -72 -183Z':'M-72 -183 H72 Q89 -104 115 -28 Q0 -9 -115 -28 Q-89 -104 -72 -183Z',base);
 body+=nested(waist,-76.5,-190,base);
 if(style==='dress')body+=pth('M-57 -171 L-39 -171 L-67 -23 L-96 -26Z',dark)+pth('M34 -171 L45 -171 L74 -23 L48 -19Z',light)+pth('M-113 -34 Q0 -15 113 -34 L115 -28 Q0 -9 -115 -28Z',accent);
 else{body+=pth('M-81 -37 Q-35 -31 0 -35 L8 -76 L17 -29 L81 -38','none',`stroke="${accent}" stroke-width="3"`);if(!back)body+=floral(p,45,-113,1)+floral(p,59,-88,.65);}
 return svg(300,210,'-150 -190 300 210',body);
}
async function main(){
 fs.mkdirSync(out,{recursive:true});
 for(const file of ['shirt.svg','pants.svg','leg.svg','sleeve-long.svg','sleeve-shorter.svg'])write(`templates/${file}`,original(file),'original SVG path crops, unchanged');
 for(const skin of parts.filter(p=>p.slot==='arm')){const color=(await colors(skin.original))[0],body=`<g transform="scale(3) translate(-131.51982 -63.8)">${pth(paths.skin[0].d,color)}</g>`;for(const side of [-1,1])write(`rig/${skin.group.toLowerCase().replaceAll(' ','-')}-${side<0?'upper':'lower'}.svg`,split(170,136,body,joint.skin.x,joint.skin.y,joint.skin.radius,color,side),'vector_skin.svg arm contour; original tint; skin inscribed circle, separate sleeve pivot');}
 for(const sleeve of parts.filter(p=>p.slot==='sleeve'&&p.name.endsWith('_long'))){const cs=await colors(sleeve.original),sorted=[...cs].sort((a,b)=>lum(a)-lum(b));sleeves('sleeve-'+sleeve.group.toLowerCase(),[cs[0],sorted[0],sorted.at(-1)]);}
 for(const [style,colors] of Object.entries(palettes))for(const [color,p] of Object.entries(colors)){
  for(const back of [false,true]){write(`formal/${style}-${color}-outer-${back?'back':'front'}.svg`,clothing(style,p,back),'vector_shirts.svg path 0, native neckline/shoulders; attached hem and small decorations');if(['dress','qipao','bridal','bridal-lace'].includes(style))write(`formal/${style}-${color}-skirt-${back?'back':'front'}.svg`,skirt(style,p,back),'vector_pants.svg waistband paths 0/1, native waist width; skirt extension from lower corners');}
  sleeves(`formal-${style}-${color}`,style==='waistcoat'?['#fffaf1','#d9d8d2','#ffffff']:p);
 }
 const veilBack=pth('M-83 -472 Q-85 -521 0 -527 Q85 -521 83 -472 Q88 -376 122 -170 Q61 -149 0 -166 Q-61 -149 -122 -170 Q-88 -376 -83 -472Z','#fffdf6','fill-opacity=".38"')+pth('M-83 -472 Q-101 -326 -122 -170 Q-61 -149 0 -166 Q61 -149 122 -170 Q101 -326 83 -472','none','stroke="#fffdf6" stroke-width="3" stroke-opacity=".8"')+pth('M-68 -458 Q-68 -322 -91 -175 M68 -458 Q68 -322 91 -175','none','stroke="#e3ddd2" stroke-width="2" stroke-opacity=".45"');
 write('accessories/veil-back.svg',svg(280,390,'-140 -530 280 390',veilBack),'vector_skin.svg head path 3 crown and shoulder anchors; translucent rear drape');
 const veilFront=pth('M-82 -476 Q-82 -521 0 -524 Q82 -521 82 -476','none','stroke="#fffdf6" stroke-width="5" stroke-linecap="round"')+[-36,-18,0,18,36].map(x=>floral(['#fff8e8','#c6b798','#fffdf6','#e4d8b9'],x,-515-Math.cos(x/45)*5,.45)).join('');
 write('accessories/veil-front.svg',svg(280,390,'-140 -530 280 390',veilFront),'vector_skin.svg head path 3; narrow crown edge and small floral pins');
 for(const back of [false,true]){
  const headwear={
   wreath:Array.from({length:9},(_,i)=>{const x=(i-4)*17,y=-470-54*Math.sqrt(1-(x/82)**2);return `<ellipse cx="${x}" cy="${y+2}" rx="13" ry="5" fill="#8b9e78" transform="rotate(${x/3} ${x} ${y+2})"/>`+floral(['#fffaf1','#caab9c','#f0d295',i%2?'#f5e9dd':'#dfb6ac'],x,y,.66);}).join(''),
   crown:pth('M-67 -535 L-77 -572 L-39 -553 L0 -589 L39 -553 L77 -572 L67 -535Z','#d4b272')+pth('M-67 -535 H67 V-526 H-67Z','#b39153')+[-42,0,42].map(x=>`<circle cx="${x}" cy="-542" r="4" fill="${back?'#e9d39f':'#8b9e91'}"/>`).join(''),
   cap:pth('M-77 -522 Q-79 -575 -13 -578 Q52 -579 72 -530 L77 -516 H-77Z','#8caaa8')+pth('M-76 -522 Q-3 -539 88 -517 L109 -504 Q18 -510 -64 -504Z','#5b7e7f')+(!back?pth('M-7 -576 Q-15 -551 -10 -530','none','stroke="#6c8f8e" stroke-width="2"'):''),
   'top-hat':pth('M-59 -536 L-65 -605 Q0 -615 65 -605 L59 -536Z','#343843')+pth('M-61 -552 H61 V-534 H-61Z','#b58d77')+pth('M-92 -536 Q0 -551 92 -536 L98 -524 Q0 -513 -98 -524Z','#242a33'),
   fedora:pth('M-70 -535 L-60 -583 Q-41 -591 -17 -580 Q6 -589 46 -585 L70 -535Z','#c7ad85')+pth('M-67 -549 Q0 -541 67 -549 L70 -533 Q0 -523 -70 -533Z','#726044')+pth('M-94 -535 Q0 -525 94 -535 L107 -522 Q0 -504 -107 -522Z','#a88d67')+(!back?pth('M-42 -580 Q-22 -553 -14 -580','none','stroke="#a78b62" stroke-width="2"'):''),
   bow:pth('M-77 -482 Q-79 -523 0 -526 Q79 -523 77 -482','none','stroke="#a5747e" stroke-width="5" stroke-linecap="round"')+pth('M-48 -526 Q-84 -552 -95 -531 Q-98 -506 -49 -517 Q-16 -551 -4 -530 Q2 -508 -43 -517Z','#c78e9b')+pth('M-57 -520 L-72 -495 L-59 -500 L-51 -489 L-42 -517 L-25 -496 L-17 -507 L-6 -502 L-34 -523Z','#aa6d7b')+pth('M-52 -532 Q-44 -536 -37 -531 L-36 -514 Q-44 -509 -52 -515Z',back?'#bd8792':'#dfb0b9'),
   beret:pth('M-78 -540 Q-93 -565 -45 -581 Q4 -599 58 -583 Q92 -570 79 -543 L67 -530 H-68Z','#728672')+pth('M-75 -544 Q0 -533 78 -544 L70 -528 Q0 -518 -73 -530Z','#465d4e')+pth('M-23 -584 L-20 -596 L-11 -594 L-13 -582Z','#465d4e')+(!back?`<circle cx="48" cy="-549" r="4" fill="#d3bd8f"/>`:''),
  };
  const seated={wreath:0,crown:22,cap:10,'top-hat':22,fedora:16,bow:0,beret:12};
  for(const [id,body] of Object.entries(headwear))write(`accessories/${id}-${back?'back':'front'}.svg`,svg(280,180,'-140 -610 280 180',`<g transform="translate(0 ${seated[id]})">${body}</g>`),'vector_skin.svg head crown and original hair anchors; fixed-size seated head accessory');
 }
 const {dressShoeStyles,dressShoeColors}=await import('../src/features/wedding/dressShoes.js');
 for(const style of dressShoeStyles)for(const p of dressShoeColors){
  const {base,dark,light,accent}=p;let body='';
  if(style.id==='oxford'){
   body=pth('M0 12.823 L9 1 L34 2 L47 14 L78 19 Q94 20 94 34 L90 40 H0Z',base)+pth('M0 34 H94 L90 42 H0Z',dark)+pth('M24 4 L40 17 L73 23 L62 29 L30 20Z',light);
   for(const y of [11,16,21])body+=pth(`M26 ${y}l14 5`,'none',`stroke="${accent}" stroke-width="2" stroke-linecap="round"`);
  }else if(style.id==='ballet'){
   body=pth('M0 12.823 Q16 4 25 12 Q32 27 47 24 L77 19 Q94 18 94 34 Q79 42 0 40Z',base)+pth('M0 36 Q55 41 94 34 L94 39 Q45 45 0 41Z',dark)+pth('M58 24 Q46 11 43 24 Q46 32 58 24 Q71 11 74 24 Q70 32 58 24',accent);
  }else{
   body=pth(style.id==='block-heel'?'M3 19 H25 L23 42 H7Z':'M5 19 H17 L15 42 H10Z',dark);
   body+=pth('M0 12.823 L8 1 H31 Q29 12 42 17 L78 25 Q94 25 94 36 H66 L38 24 Q30 22 24 29 H15 L12 16Z',base)+pth('M66 35 H94 V41 H63Z',dark)+pth('M34 18 L78 28 Q88 28 90 32 H70Z',light);
   if(style.id==='ankle-strap')body+=pth('M0 4 H31 V10 H0Z',dark)+`<rect x="4" y="4" width="8" height="6" rx="1" fill="${accent}"/>`;
   else body+=`<circle cx="74" cy="29" r="2.5" fill="${accent}"/>`;
  }
  write(`shoes/${style.id}-${p.id}.svg`,svg(94,42,'0 0 94 42',body),'original shoes 94x42 frame and inner ankle (0,12.823551); independent flat-color shoe contours; no leg scaling');
 }
 writeAsset(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
 const manifestPath=path.join(root,'asset/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 for(const asset of catalog.assets){const rel=`wedding/kenney_modular-characters/${asset.file}`,entry={source:rel,public:rel,mode:'copy'},index=manifest.findIndex(e=>e.public===rel);if(index<0)manifest.push(entry);else manifest[index]=entry;}
 writeAsset(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 console.log(`Generated ${catalog.assets.length} SVG assets under ${out}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
