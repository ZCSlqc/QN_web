export const dressShoeStyles=[
 {id:'oxford',label:'系带皮鞋'},
 {id:'ballet',label:'蝴蝶结礼鞋'},
 {id:'stiletto',label:'细跟高跟鞋'},
 {id:'block-heel',label:'粗跟高跟鞋'},
 {id:'ankle-strap',label:'绑带高跟鞋'},
];
export const dressShoeColors=[
 {id:'black',group:'Black',label:'经典黑',base:'#353a42',dark:'#1c222b',light:'#666e78',accent:'#baa782'},
 {id:'ivory',group:'White',label:'珍珠白',base:'#f7f3eb',dark:'#c8c3bd',light:'#ffffff',accent:'#d0b68a'},
 {id:'red',group:'Red',label:'酒红',base:'#9c4d59',dark:'#642e3b',light:'#bf7c83',accent:'#dfc38e'},
 {id:'nude',group:'Tan',label:'裸粉',base:'#d4b5a3',dark:'#a58675',light:'#efdbcb',accent:'#f3e7d2'},
];
export const dressShoes=dressShoeStyles.flatMap(style=>dressShoeColors.map(color=>({
 id:`dress-shoe-${style.id}-${color.id}`,slot:'shoes',dressShoe:true,style:style.id,label:style.label,group:color.group,color:color.id,
 name:`${style.label} · ${color.label}`,derivedFile:`shoes/${style.id}-${color.id}.svg`,width:94,height:42,
 anchor:{x:0,y:12.823551278186965},
})));
