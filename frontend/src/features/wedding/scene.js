import { loadCharacters, looks } from "./characters";
import { makeAppearance, normalizeAppearance, emojiHeads, findPart } from "./catalog";
import { loadCats } from "./cats";
import { personalityNames } from "./catLife";
import { nearestWalkable, walkingRoute } from "./navigation.js";
import {actionDuration,danceMoves,characterMotion} from './motions';
import {danceFor,danceEmojiAt} from './choreography';
import {dailyMoves} from './dailyMotions';
import {rouletteDuration,rouletteIndex,rouletteCandidates} from './emojiRoulette';
import {createAmbientPeople} from './ambientPeople';
import { loadFloristBackdrop, items, floristPosition, paymentStand } from './amenities';
import {carryMode,assignCarryHand,heldSide} from './heldItems';
import {createWeddingPeople} from './weddingPeople';
import {loadJugglerProps,jugglerPosition,jugglerSaying} from './juggling';
import {circularHandFrame} from './circularArm';
import {upperPoint} from './rigidRig';
import {withDefaultFace} from './faceLayouts';

const WIDTH = 1600,
  HEIGHT = 900;
export async function createWeddingScene(host, onLabels, { signal, onPet = () => {},onPetApproach=()=>{}, onLayout = () => {}, onMotion = () => {}, onExpression = () => {}, danceEmoji=true,role=null,persona='guest',username=null,people=[],npcFaces={},playerAppearance=null } = {}) {
  const background = new Image();
  background.src = "/wedding/background/garden-orthographic.webp";
  // Complete static asset loading first so a failed image cannot leak character caches.
  const [, catArt, giftArt,jugglerArt] = await Promise.all([background.decode(), loadCats({ signal }), loadFloristBackdrop(),loadJugglerProps()]);
  const art = await loadCharacters();
  const cats = catArt.cats;
  if (signal?.aborted) {
    art.dispose();
    throw new DOMException("Page closed", "AbortError");
  }
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d"),
    backdrop = document.createElement("canvas"),
    backdropCtx = backdrop.getContext("2d");
  if (!ctx || !backdropCtx) throw new Error("Canvas unavailable");
  backdrop.className='wedding-backdrop';
  backdrop.setAttribute('aria-hidden','true');
  Object.assign(backdrop.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "婚礼庭院，点击地面走动，点击猫咪摸摸，拖动查看两侧；也可使用方向键",
  );
  canvas.dataset.renderer = "2d";

  const {actors,player}=createWeddingPeople(people,{username,role,persona,appearance:playerAppearance});
  actors.push({name:'花礼管家',kind:'florist',npc:true,...floristPosition,direction:'front',appearance:withDefaultFace({...makeAppearance(3),formalStyle:'qipao',formalColor:'red',sleeve:'shorter'},npcFaces.florist)});
  actors.push({name:'招财小哥',kind:'juggler',npc:true,...jugglerPosition,direction:'front',appearance:withDefaultFace({...makeAppearance(1),formalStyle:'waistcoat',formalColor:'camel',sleeve:'long',headwear:'top-hat',shirt:findPart('shirt','White',p=>p.name.endsWith('5')).id},npcFaces.juggler)});
  for(const actor of actors)if(!actor.kind)Object.assign(actor,nearestWalkable(actor));
  actors.find(a=>a.role==='bride').heldItem=assignCarryHand(items.find(i=>i.id==='bouquet-garden'));
  try {
    await Promise.all(
      actors.flatMap(actor => [art.ensureAppearance(actor.appearance),art.ensureHeldItem(actor.heldItem)]),
    );
  } catch (error) {
    art.dispose();
    throw error;
  }
  if (signal?.aborted) {
    art.dispose();
    canvas.remove();
    throw new DOMException("Page closed", "AbortError");
  }
  host.before(backdrop);
  host.append(canvas);
  const hearts = [];
  let emotion = null, roulette=null,emotionVersion = 0, carryVersion=0;
  let sceneTime = 0,
    blessingArrivals = 0,
    customizeVersion = 0;

  let width = 0,
    height = 0,
    scale = 1,
    pan = 0,
    destination,
    route = [],
    gestureUntil = 0,
    locateUntil = 0,
    frame,
    previous = 0,
    lastTick = 0,
    lastLabels = 0,
    pointerStart,
    disposed = false,
    dirty = true;
  let backdropCamera=null,lastLayout='',lastLabelValue='',lastMotion='',catLoadTimer;
  let controls,pendingAfterJump=null,pendingPet=null;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia('(max-width: 600px), (pointer: coarse)');
  const ambient=createAmbientPeople(actors.filter(actor=>actor.kind!=='juggler'),player,walkingRoute);
  let danceEmojiEnabled=danceEmoji,danceHeadVersion=0,danceHeadBase='';const danceHeads=new Map();
  async function prepareDanceHeads(id){
    const dance=danceFor(id);if(!danceEmojiEnabled||!dance?.emoji)return;const version=++danceHeadVersion,base=player.appearance,baseKey=JSON.stringify(base);
    if(baseKey!==danceHeadBase){danceHeads.clear();danceHeadBase=baseKey;}
    await Promise.all(dance.emoji.map(async head=>{try{const appearance=await art.ensureAppearance({...base,animalHead:head});if(!disposed&&version===danceHeadVersion){danceHeads.set(head,{id:head,appearance,started:player.gestureStarted});dirty=true;}}catch{/* The dance still plays with the original face when an optional head fails. */}}));
  }
  function automaticHead(){if(!danceEmojiEnabled||motion.matches||emotion||roulette)return null;const id=danceEmojiAt(player.gesture,Math.max(0,sceneTime/1000-(player.gestureStarted||0)));return danceHeads.get(id)||null;}
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const worldLeft = () => (width - WIDTH * scale) / 2 + pan;
  const worldTop = () => (height - HEIGHT * scale) / 2;
  const jumping=()=>player.gesture==='jump'&&!motion.matches&&sceneTime<gestureUntil;
  const onScreen=actor=>worldLeft()+(actor.x+(actor.cat?44:90))*scale>0&&worldLeft()+(actor.x-(actor.cat?44:90))*scale<width&&worldTop()+(actor.y+30)*scale>0&&worldTop()+(actor.y-(actor.cat?80:210))*scale<height;
  function constrainPan() {
    const limit = Math.max(0, (WIDTH * scale - width) / 2);
    pan = clamp(pan, -limit, limit);
  }
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    backdrop.width = canvas.width;
    backdrop.height = canvas.height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    backdropCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    backdropCamera=null;
    scale = Math.max(width / WIDTH, height / HEIGHT);
    constrainPan();
    dirty = true;
  }
  function setDestination(x, y) {
    if(jumping()){pendingAfterJump=()=>setDestination(x,y);return;}
    ambient.interrupt(sceneTime);
    pendingPet=null;
    const nextRoute = walkingRoute(player, { x, y });
    if (!nextRoute?.length) return;
    route = nextRoute;
    destination = route.at(-1);
    player.gesture = "";
    if (motion.matches) {
      player.x = destination.x;
      player.y = destination.y;
      destination = null;
      route = [];
      player.walking = false;
    }
    dirty = true;
  }
  function petCat(id) {
    if(jumping()){pendingAfterJump=()=>petCat(id);return;}
    ambient.interrupt(sceneTime);
    const cat = cats.find((item) => item.id === id);
    if (!cat || disposed) return;
    const distance=Math.hypot(cat.x-player.x,cat.y-player.y);
    if(distance>=35&&distance<=76){destination=null;route=[];player.walking=false;catArt.pet(id,player);onPet(cat.name);pendingPet=null;dirty=true;return;}
    const candidates=[[-58,8],[58,8],[-45,32],[45,32],[0,58]].map(([dx,dy])=>nearestWalkable({x:cat.x+dx,y:cat.y+dy})).filter(p=>Math.hypot(p.x-cat.x,p.y-cat.y)>=40&&Math.hypot(p.x-cat.x,p.y-cat.y)<80&&!actors.some(a=>a!==player&&Math.hypot(p.x-a.x,p.y-a.y)<35)).map(p=>({point:p,route:walkingRoute(player,p)})).filter(p=>p.route?.length);
    if(!candidates.length)return;
    const cost=entry=>entry.route.reduce((sum,p,i)=>sum+Math.hypot(p.x-(i?entry.route[i-1].x:player.x),p.y-(i?entry.route[i-1].y:player.y)),0);
    candidates.sort((a,b)=>cost(a)-cost(b));const goal=candidates[0].point;
    catArt.reservePet(id,player);setDestination(goal.x,goal.y);pendingPet={id};onPetApproach(cat.name);
    if(motion.matches){catArt.pet(id,player);onPet(cat.name);pendingPet=null;}
    dirty = true;
  }
  function down(event) {
    if (event.button !== 0 || pointerStart) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - worldLeft()) / scale,
      y = (event.clientY - rect.top - worldTop()) / scale;
    const touchedCat = [...cats].sort((a, b) => b.y - a.y).find((item) =>
      Math.abs(x - item.x) <= 40 && y >= item.y - (item.state === "lie" ? 40 : 62) && y <= item.y + 6,
    );
    pointerStart = {
      catId: touchedCat?.id,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pan,
      dragged: false,
    };
    canvas.setPointerCapture(event.pointerId);
  }
  function move(event) {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x,
      dy = event.clientY - pointerStart.y;
    if (Math.hypot(dx, dy) > 7) pointerStart.dragged = true;
    if (pointerStart.dragged) {
      pan = pointerStart.pan + dx;
      constrainPan();
      dirty = true;
    }
  }
  function up(event) {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    if (!pointerStart.dragged) {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left - worldLeft()) / scale,
        y = (event.clientY - rect.top - worldTop()) / scale;
      const cat = [...cats].sort((a, b) => b.y - a.y).find((item) =>
        Math.abs(x - item.x) <= 40 && y >= item.y - (item.state === "lie" ? 40 : 62) && y <= item.y + 6,
      );
      if (pointerStart.catId || cat) petCat(pointerStart.catId || cat.id);
      else setDestination(x, y);
    }
    pointerStart = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  }
  function cancel() {
    pointerStart = null;
  }
  function key(event) {
    const vectors = {
      ArrowLeft: [-75, 0],
      ArrowRight: [75, 0],
      ArrowUp: [0, -60],
      ArrowDown: [0, 60],
    };
    const v = vectors[event.key];
    if (v) {
      event.preventDefault();
      setDestination(player.x + v[0], player.y + v[1]);
    }
  }
  const events = {
    pointerdown: down,
    pointermove: move,
    pointerup: up,
    pointercancel: cancel,
    keydown: key,
  };
  Object.entries(events).forEach(([type, fn]) =>
    canvas.addEventListener(type, fn),
  );
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  function drawBackdrop() {
    const left=worldLeft(),top=worldTop();
    if(backdropCamera?.left===left&&backdropCamera?.top===top&&backdropCamera?.scale===scale)return;
    backdropCtx.clearRect(0,0,width,height);
    backdropCtx.save();backdropCtx.translate(left,top);backdropCtx.scale(scale,scale);
    backdropCtx.drawImage(background,0,0,WIDTH,HEIGHT);
    giftArt.drawBackdrop(backdropCtx);backdropCtx.restore();
    backdropCamera={left,top,scale};
  }
  function setData(key,value){if(canvas.dataset[key]!==value)canvas.dataset[key]=value;}
  function labels() {
    const layout={ left: worldLeft(), top: worldTop(), scale, playerX: player.x, playerY: player.y };
    const layoutValue=JSON.stringify(layout);
    if(layoutValue!==lastLayout){lastLayout=layoutValue;onLayout(layout);}
    const nextLabels=
      [...actors.filter(onScreen), ...cats].map((a, i) => {
        const frame=a.cat?null:characterMotion(a,sceneTime/1000,motion.matches);
        return ({
        id: a.cat ? a.id : i,
        cat: !!a.cat,
        station: a.kind==='florist',
        active: !!a.cat && a.reactingUntil > sceneTime,
        name: a.name,
        username:a.username||null,
        speech:a.kind==='juggler'?jugglerSaying:null,
        speechX:Math.max(122,Math.min(width-122,worldLeft()+paymentStand.x*scale)),
        speechY:worldTop()+(paymentStand.y-paymentStand.height-12)*scale,
        emotion: null,
        personality: a.cat ? personalityNames[a.personality] : "",
        x: worldLeft() + (a.x+(frame?.bodyOffset?.x||0)*.25) * scale,
        y: worldTop() + (a.y - (a.cat ? 65 : 137) + ((frame?.bodyOffset?.y||0)-(frame?.lift||0))*.25) * scale,
        visible:
          worldLeft() + a.x * scale > 24 &&
          worldLeft() + a.x * scale < width - 24,
      });});
    const labelValue=JSON.stringify(nextLabels);
    if(labelValue!==lastLabelValue){lastLabelValue=labelValue;onLabels(nextLabels);}
    setData('playerX',player.x.toFixed(1));
    setData('playerY',player.y.toFixed(1));
    setData('characterScale',scale.toFixed(3));
    setData('playerLook',String(player.look));
    setData('playerRole',role||'guest');
    setData('playerPersona',persona);
    setData('gesture',player.gesture || "idle");
    setData('pettingTarget',pendingPet?.id||'');
    setData('walking',String(!!player.walking));
    setData('motionRig','original-svg-segments');
    const playerFrame=characterMotion(player,sceneTime/1000,motion.matches);
    setData('jumpHeight',playerFrame.lift.toFixed(1));
    setData('jumpPhase',playerFrame.jumpPhase);
    const dance=player.gesture&&danceFor(player.gesture),status=dance?{id:dance.id,label:dance.label,remaining:Math.max(0,Math.ceil((gestureUntil-sceneTime)/1000))}:null,statusValue=JSON.stringify(status);
    if(statusValue!==lastMotion){lastMotion=statusValue;onMotion(status);}
    setData('pan',pan.toFixed(1));
    setData('heartCount',String(hearts.length));
    setData('blessingArrivals',String(blessingArrivals));
    setData('blessingTargets',actors
      .slice(0, 2)
      .map((actor) => actor.name)
      .join(","));
    setData('appearance',JSON.stringify(player.appearance));
    setData('emotion',emotion?.id || "");
    setData('temporaryHead',emotion?.id||'');
    setData('emojiRolling',String(!!roulette));
    const autoHead=automaticHead();setData('danceHead',autoHead?.id||'');
    setData('headAngle',characterMotion({...player,emotionStarted:emotion?.started??autoHead?.started},sceneTime/1000,motion.matches).rigidPose.head.toFixed(2));
    setData('people',JSON.stringify(actors.map(a=>({name:a.name,username:a.username||null,npc:!!a.npc,kind:a.kind||'visitor',x:a.x,y:a.y,walking:!!a.walking,action:a.kind==='juggler'?'juggle':a.gesture||a.ambientAction||'idle',heldItem:a.heldItem?.id||'',face:a.appearance.face,formalStyle:a.appearance.formalStyle,formalColor:a.appearance.formalColor,appearance:a.username==='lqc'||a.username==='shenqidayang'?a.appearance:undefined}))));
    const juggler=actors.find(a=>a.kind==='juggler');
    if(onScreen(juggler))setData('juggling',JSON.stringify(jugglerArt.frame(sceneTime/1000,motion.matches).map(p=>({id:p.id,x:juggler.x+p.x,y:juggler.y+p.y,airborne:p.airborne}))));
    setData('heldItem',player.heldItem?.id||'');
    setData('heldHand',!player.heldItem?'none':carryMode(player.heldItem)==='two-hands'?'both':heldSide(player.heldItem)<0?'left':'right');
    setData('carryMode',carryMode(player.gesture?null:player.heldItem));
    setData('cats',JSON.stringify(cats.map(({ id, x, y, reactingUntil, state, personality, activity, stride, facing }) => ({
      id, x: worldLeft() + x * scale, y: worldTop() + (y - 29) * scale,
      worldX: x, worldY: y, state, personality, activity, stride, facing,
      reacting: reactingUntil > sceneTime,
    }))));
  }
  function tick(now) {
    if (disposed) return;
    if(!dirty&&now-lastTick<1000/(compact.matches?30:60)-1){frame=requestAnimationFrame(tick);return;}
    lastTick=now;
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    if (document.hidden) return;
    sceneTime += dt * 1000;
    if(roulette){const elapsed=sceneTime-roulette.started;
      if(elapsed>=rouletteDuration){emotion={...roulette.final,started:sceneTime/1000,until:now+5000};roulette=null;onExpression({rolling:false,label:emotion.label});dirty=true;}
      else{const item=roulette.frames[rouletteIndex(elapsed,roulette.frames.length)];if(emotion?.id!==item.id){emotion={...item,started:roulette.started/1000,until:Infinity};dirty=true;}}
    }
    if (emotion && now >= emotion.until) { emotion = null;onExpression(null); dirty = true; }
    let animate = !!destination || !!player.gesture || !!emotion || !!roulette || hearts.length > 0 || sceneTime < locateUntil;
    if (destination) {
      const waypoint = route[0];
      const dx = waypoint.x - player.x,
        dy = waypoint.y - player.y,
        d = Math.hypot(dx, dy);
      if (d < 2) {
        player.x = waypoint.x;
        player.y = waypoint.y;
        route.shift();
        if (!route.length) destination = null;
        player.walking = !!route.length;
      } else {
        player.walking = true;
        player.direction =
          Math.abs(dx) > Math.abs(dy)
            ? dx < 0
              ? "left"
              : "right"
            : dy < 0
              ? "back"
              : "front";
        const step = Math.min(d, dt * 135);
        player.x += (dx / d) * step;
        player.y += (dy / d) * step;
      }
    }
    if(pendingPet&&!destination){const cat=cats.find(c=>c.id===pendingPet.id);if(cat&&Math.hypot(cat.x-player.x,cat.y-player.y)<90){catArt.pet(cat.id,player);onPet(cat.name);}pendingPet=null;dirty=true;ambient.interrupt(sceneTime);}
    animate = ambient.update(dt,sceneTime,motion.matches,!!destination,onScreen) || animate;
    const juggler=actors.find(a=>a.kind==='juggler'),jugglerVisible=onScreen(juggler);
    animate=(!motion.matches&&jugglerVisible)||animate;
    animate = catArt.update(dt, sceneTime, actors, player, motion.matches) || animate;
    if (player.gesture && sceneTime >= gestureUntil) {
      player.gesture = "";
      ambient.interrupt(sceneTime);
      const next=pendingAfterJump;pendingAfterJump=null;next?.();
      dirty = true;
    }
    if (dirty || animate) {
      drawBackdrop();
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(worldLeft(), worldTop());
      ctx.scale(scale, scale);
      if(sceneTime < locateUntil){
        const progress=1-(locateUntil-sceneTime)/2400;
        const radius=motion.matches?30:25+8*Math.sin(progress*Math.PI*4)**2;
        ctx.save();ctx.globalAlpha=Math.min(1,(1-progress)*4);
        ctx.strokeStyle='#b66a50';ctx.fillStyle='#fff5cb66';ctx.lineWidth=3;
        ctx.beginPath();ctx.ellipse(player.x,player.y-2,radius,radius*.36,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
      }
      // Depth controls draw order only. All people retain identical scale.
      for (const actor of [...actors, ...cats].sort((a, b) => a.y - b.y)) {
        if(!onScreen(actor))continue;
        if (actor.cat) catArt.draw(ctx, actor, sceneTime, motion.matches);
        else {const head=actor===player?(emotion||automaticHead()):null;art.draw(ctx,head?{...actor,appearance:head.appearance,emotionStarted:head.started}:actor, sceneTime / 1000, motion.matches);if(actor.kind==='juggler'&&jugglerVisible)jugglerArt.draw(ctx,actor,sceneTime/1000,motion.matches);}
      }
      if (destination) {
        ctx.strokeStyle = "#9c806980";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(destination.x, destination.y, 12, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = hearts.length - 1; i >= 0; i--) {
        const heart = hearts[i],
          progress = (sceneTime - heart.start) / heart.duration;
        if (progress < 0) continue;
        if (progress >= 1) {
          hearts.splice(i, 1);
          blessingArrivals++;
          dirty = true;
          continue;
        }
        const t = Math.min(1, progress),
          eased = t * t * (3 - 2 * t);
        const x = motion.matches
          ? heart.to.x
          : (1 - eased) ** 2 * heart.from.x +
            2 * (1 - eased) * eased * heart.control.x +
            eased ** 2 * heart.to.x;
        const y = motion.matches
          ? heart.to.y
          : (1 - eased) ** 2 * heart.from.y +
            2 * (1 - eased) * eased * heart.control.y +
            eased ** 2 * heart.to.y;
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = Math.min(1, t * 7, (1 - t) * 8);
        const heartWidth=26,heartHeight=heartWidth*giftArt.heart.naturalHeight/giftArt.heart.naturalWidth;
        ctx.drawImage(giftArt.heart,-heartWidth/2,-heartHeight/2,heartWidth,heartHeight);
        ctx.restore();
      }
      ctx.restore();
      if (dirty || now - lastLabels > 33) {
        labels();
        lastLabels = now;
      }
      dirty = false;
      if(!motion.matches&&!catLoadTimer&&catArt.needsActions(onScreen)){
        catLoadTimer=setTimeout(()=>{
          catLoadTimer=null;
          if(!disposed&&!motion.matches)void catArt.loadActions({isVisible:onScreen,onReady:()=>{dirty=true;}}).finally(()=>{dirty=true;});
        },350);
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function visibility() {
    cancelAnimationFrame(frame);
    previous = performance.now();
    if (!document.hidden) {
      dirty = true;
      frame = requestAnimationFrame(tick);
    }
  }
  function reducedChanged() {
    if (motion.matches && destination) {
      player.x = destination.x;
      player.y = destination.y;
      destination = null;
      route = [];
      player.walking = false;
    }
    dirty = true;
  }
  document.addEventListener("visibilitychange", visibility);
  motion.addEventListener("change", reducedChanged);
  frame = requestAnimationFrame(tick);
  return controls={
    approach(station) {
      setDestination(station.x, station.y);
      if(station.id==='payment'){
        const focusX=(station.x+jugglerPosition.x)/2;
        pan=width/2-((width-WIDTH*scale)/2+focusX*scale);constrainPan();dirty=true;
      }
    },
    stopApproach() { destination=null;route=[];pendingPet=null;player.walking=false;dirty=true; },
    async carry(id){
      const version=++carryVersion,item=id?items.find(i=>i.id===id&&i.uses.includes('handheld')):null;
      if(id&&!item)return false;
      await art.ensureHeldItem(item);
      if(disposed||version!==carryVersion)return false;
      player.heldItem=assignCarryHand(item);if(!jumping())player.gesture='';player.ambientAction='';
      ambient.interrupt(sceneTime);player.direction='front';dirty=true;return true;
    },
    async express(id) {
      const item = emojiHeads.find(e => e.id === id);
      if (!item || disposed) return false;
      const version = ++emotionVersion;
      roulette=null;if(emotion)emotion.until=performance.now()+5000;
      onExpression(null);
      let base,temporary;
      do{base=player.appearance;temporary=await art.ensureAppearance({...base,animalHead:id});if(disposed||version!==emotionVersion)return false;}while(base!==player.appearance);
      emotion = { id, label: item.label, appearance:temporary, started:sceneTime/1000,until: performance.now()+5000 };
      onExpression({rolling:false,label:item.label});
      ambient.interrupt(sceneTime);
      dirty = true;
      return true;
    },
    async spinEmoji(){
      const version=++emotionVersion,{final,candidates}=rouletteCandidates(emojiHeads);roulette=null;
      if(emotion)emotion.until=performance.now()+5000;onExpression({rolling:true,loading:true});
      try{
        let base,frames;
        do{base=player.appearance;frames=await Promise.all(candidates.map(async item=>({id:item.id,label:item.label,appearance:await art.ensureAppearance({...base,animalHead:item.id})})));if(disposed||version!==emotionVersion)return false;}while(base!==player.appearance);
        if(motion.matches){emotion={...frames.find(f=>f.id===final.id),started:sceneTime/1000,until:performance.now()+5000};onExpression({rolling:false,label:final.label});}
        else{roulette={frames,final:frames.find(f=>f.id===final.id),started:sceneTime};onExpression({rolling:true,loading:false});}
        ambient.interrupt(sceneTime);dirty=true;return true;
      }catch(error){if(version===emotionVersion)onExpression(null);throw error;}
    },
    petCat,
    setDanceEmoji(enabled){danceEmojiEnabled=!!enabled;dirty=true;if(enabled)void prepareDanceHeads(player.gesture);},
    gesture(kind) {
      ambient.interrupt(sceneTime);
      pendingPet=null;
      if (!["walk", "clap", "bless", "dance",...dailyMoves.map(p=>p.id),...danceMoves.map(p=>p.id)].includes(kind)) return false;
      if(jumping()){pendingAfterJump=()=>controls.gesture(kind);return true;}
      if (kind === "walk") {
        player.gesture = "";
        dirty = true;
        canvas.focus({ preventScroll: true });
        return true;
      }
      if (kind === "bless" && hearts.length) return false;
      destination = null;
      route = [];
      player.walking = false;
      player.gesture = kind;
      player.gestureStarted = sceneTime / 1000;
      gestureUntil = sceneTime + actionDuration(kind)*1000;
      player.direction = "front";
      if(danceFor(kind)?.emoji)void prepareDanceHeads(kind);
      if (kind === "bless") {
        // The two closest cats join in; repeated clicks cannot stack reactions.
        catArt.bless(player);
        blessingArrivals = 0;
        for (const [index, recipient] of actors.slice(0, 2).entries()){
          const delay=950+index*180,frame=characterMotion(player,(sceneTime+delay)/1000,motion.matches);
          const palms=[-1,1].map(side=>upperPoint(circularHandFrame(frame.rigidPose,frame.rigidBindings,side<0?frame.leftCircularArm:frame.circularArm,side).palm,frame.rigidPose,frame.rigidBindings));
          hearts.push({
            from: { x:player.x+(palms[0].x+palms[1].x)*.125,y:player.y+(palms[0].y+palms[1].y)*.125 },
            to: { x: recipient.x, y: recipient.y - 75 },
            control: {
              x: (player.x + recipient.x) / 2 + (index ? 110 : -110),
              y: Math.min(player.y, recipient.y) - 125,
            },
            start: sceneTime + delay,
            duration: 1700,
          });
        }
      }
      dirty = true;
      return true;
    },
    async customize(name, value) {
      const version = ++customizeVersion;
      const appearance = normalizeAppearance(
        typeof value === "number" ? looks[value]?.appearance : value,
      );
      await art.ensureAppearance(appearance);
      if (disposed || version !== customizeVersion) return false;
      player.name = name;
      player.appearance = appearance;
      danceHeadVersion++;danceHeads.clear();if(player.gesture&&danceFor(player.gesture)?.emoji)void prepareDanceHeads(player.gesture);
      if(roulette){roulette=null;emotionVersion++;if(emotion)emotion.until=performance.now()+5000;onExpression(emotion?{rolling:false,label:emotion.label}:null);}
      player.look = typeof value === "number" ? value : "custom";
      player.direction = "front";
      if(emotion){const active=emotion,temporary=await art.ensureAppearance({...appearance,animalHead:active.id});if(!disposed&&version===customizeVersion&&emotion===active)active.appearance=temporary;}
      dirty = true;
      return true;
    },
    center() {
      pan = width / 2 - ((width - WIDTH * scale) / 2 + player.x * scale);
      constrainPan();
      locateUntil=sceneTime+2400;
      dirty = true;
    },
    dispose() {
      disposed = true;
      danceHeadVersion++;danceHeads.clear();
      pendingAfterJump=null;
      pendingPet=null;
      clearTimeout(catLoadTimer);
      catArt.dispose();
      emotionVersion++;
      roulette=null;
      emotion = null;
      customizeVersion++;
      carryVersion++;
      hearts.length = 0;
      cancelAnimationFrame(frame);
      observer.disconnect();
      Object.entries(events).forEach(([type, fn]) =>
        canvas.removeEventListener(type, fn),
      );
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", reducedChanged);
      art.dispose();
      canvas.remove();
      backdrop.remove();
    },
  };
}
