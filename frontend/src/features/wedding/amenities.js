import {originalArt,loadOriginalImages} from './originalArt';

export const items = originalArt.filter(item => item.uses.includes('handheld'));
export const floristPosition = { x: 310, y: 265 };
export const paymentStand = { x: 1295, y: 255, width: 78, height: 120 };
export const stations = [
  { id: 'drinks', label: '饮料与小食', icon: '🥤', x: 100, y: 380, categories: ['drinks','food'] },
  { id: 'desserts', label: '中餐与甜品', icon: '🍰', x: 1500, y: 475, categories: ['meals','desserts'] },
  { id: 'gifts', label: '礼物与鲜花', icon: '💐', ...floristPosition, categories: ['flowers', 'gifts', 'balloons', 'celebration'] },
  { id: 'payment', label: '随个份子', icon: '💌', ...paymentStand },
];
export async function loadFloristBackdrop() {
  const payment=new Image();payment.src='/wedding/payment/wechat-preview.webp';
  const [,images]=await Promise.all([payment.decode(),loadOriginalImages(['gift-festive','basket-garden','heart'])]);
  const backdrop=document.createElement('canvas');backdrop.width=520;backdrop.height=376;const b=backdrop.getContext('2d');b.scale(2,2);
  function prop(id,x,y,width){const im=images.get(id),height=width*im.naturalHeight/im.naturalWidth;b.drawImage(im,x,y-height,width,height);}
  b.fillStyle='#b88b64';b.fillRect(25,127,9,49);b.fillRect(227,127,9,49);b.fillStyle='#f6e7cc';b.fillRect(13,116,235,17);b.fillStyle='#d2ad83';b.fillRect(13,130,235,5);
  prop('basket-garden',5,123,95);prop('gift-festive',188,123,65);
  // Cache the stand once; both decorations are drawn below all characters.
  const stand=document.createElement('canvas'),density=2,legHeight=20;
  stand.width=(paymentStand.width+12)*density;
  stand.height=(paymentStand.height+legHeight+8)*density;
  const pen=stand.getContext('2d');
  pen.scale(density,density);pen.translate(6,0);
  const {width:w,height:h}=paymentStand;
  pen.strokeStyle='#997653';pen.lineWidth=5;
  pen.beginPath();pen.moveTo(15,h-2);pen.lineTo(11,h+legHeight);pen.moveTo(w-15,h-2);pen.lineTo(w-11,h+legHeight);pen.stroke();
  pen.fillStyle='#ba9470';pen.shadowColor='#76543635';pen.shadowBlur=2;pen.shadowOffsetX=3;pen.shadowOffsetY=4;
  pen.fillRect(0,0,w,h);pen.shadowColor='transparent';
  pen.fillStyle='#fff9ed';pen.fillRect(4,4,w-8,h-12);
  const codeWidth=w-20,codeHeight=codeWidth*payment.naturalHeight/payment.naturalWidth;
  pen.drawImage(payment,10,10,codeWidth,codeHeight);
  pen.textAlign='center';pen.fillStyle='#715440';pen.font='600 9px "Microsoft YaHei", sans-serif';pen.fillText('随个份子 ♡',w/2,h-20);
  pen.fillStyle='#a2886e';pen.font='8px "Microsoft YaHei", sans-serif';pen.fillText('点击放大',w/2,h-8);
  return {
    heart:images.get('heart'),
    drawBackdrop(ctx) {
      const height=175,width=height*backdrop.width/backdrop.height;
      ctx.drawImage(backdrop,floristPosition.x-width/2,floristPosition.y+13-height,width,height);
      ctx.drawImage(stand,paymentStand.x-w/2-6,paymentStand.y-h,stand.width/density,stand.height/density);
    },
  };
}
