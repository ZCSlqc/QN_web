import { loadCharacters, looks } from "./characters";
import { makeAppearance, normalizeAppearance, emojiHeads, findPart } from "./catalog";
import { loadCats } from "./cats";
import { personalityNames } from "./catLife";
import { nearestWalkable, walkingRoute } from "./navigation.js";
import {actionDuration,danceMoves,characterMotion} from './motions';
import {createAmbientPeople} from './ambientPeople';
import { loadFloristBackdrop, items, floristPosition, paymentStand } from './amenities';
import {carryMode} from './heldItems';
import {createWeddingPeople} from './weddingPeople';
import {loadJugglerProps,jugglerPosition,jugglerSaying} from './juggling';

const WIDTH = 1600,
  HEIGHT = 900;
export async function createWeddingScene(host, onLabels, { signal, onPet = () => {}, onLayout = () => {}, role=null,persona='guest',username=null,people=[],playerAppearance=null } = {}) {
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
    ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "婚礼庭院，点击地面走动，点击猫咪摸摸，拖动查看两侧；也可使用方向键",
  );
  canvas.dataset.renderer = "2d";

  const {actors,player}=createWeddingPeople(people,{username,role,persona,appearance:playerAppearance});
  actors.push({name:'花礼管家',kind:'florist',npc:true,...floristPosition,direction:'front',appearance:{...makeAppearance(3),formalStyle:'qipao',formalColor:'red',sleeve:'shorter'}});
  actors.push({name:'招财小哥',kind:'juggler',npc:true,...jugglerPosition,direction:'front',appearance:{...makeAppearance(1),formalStyle:'waistcoat',formalColor:'camel',sleeve:'long',headwear:'top-hat',shirt:findPart('shirt','White',p=>p.name.endsWith('5')).id}});
  for(const actor of actors)Object.assign(actor,nearestWalkable(actor));
  actors.find(a=>a.role==='bride').heldItem=items.find(i=>i.id==='bouquet-blush-sticker');
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
  host.append(canvas);
  const hearts = [];
  let emotion = null, emotionVersion = 0, carryVersion=0;
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
    lastLabels = 0,
    pointerStart,
    disposed = false,
    dirty = true;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const ambient=createAmbientPeople(actors.filter(actor=>!actor.npc),player,walkingRoute);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const worldLeft = () => (width - WIDTH * scale) / 2 + pan;
  const worldTop = () => (height - HEIGHT * scale) / 2;
  const onScreen=actor=>worldLeft()+(actor.x+90)*scale>0&&worldLeft()+(actor.x-90)*scale<width&&worldTop()+(actor.y+30)*scale>0&&worldTop()+(actor.y-210)*scale<height;
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
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.max(width / WIDTH, height / HEIGHT);
    constrainPan();
    dirty = true;
  }
  function setDestination(x, y) {
    ambient.interrupt(sceneTime);
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
    ambient.interrupt(sceneTime);
    const cat = cats.find((item) => item.id === id);
    if (!cat || disposed) return;
    catArt.pet(id, player);
    onPet(cat.name);
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
  function labels() {
    onLayout({ left: worldLeft(), top: worldTop(), scale, playerX: player.x, playerY: player.y });
    onLabels(
      [...actors.filter(onScreen), ...cats].map((a, i) => ({
        id: a.cat ? a.id : i,
        cat: !!a.cat,
        active: !!a.cat && a.reactingUntil > sceneTime,
        name: a.name,
        username:a.username||null,
        speech:a.kind==='juggler'?jugglerSaying:null,
        speechX:Math.max(122,Math.min(width-122,worldLeft()+paymentStand.x*scale)),
        speechY:worldTop()+(paymentStand.y-paymentStand.height-12)*scale,
        emotion: null,
        personality: a.cat ? personalityNames[a.personality] : "",
        x: worldLeft() + a.x * scale,
        y: worldTop() + (a.y - (a.cat ? 65 : 137) - (a.cat?0:characterMotion(a,sceneTime/1000,motion.matches).lift*.25)) * scale,
        visible:
          worldLeft() + a.x * scale > 24 &&
          worldLeft() + a.x * scale < width - 24,
      })),
    );
    canvas.dataset.playerX = player.x.toFixed(1);
    canvas.dataset.playerY = player.y.toFixed(1);
    canvas.dataset.characterScale = scale.toFixed(3);
    canvas.dataset.playerLook = String(player.look);
    canvas.dataset.playerRole=role||'guest';
    canvas.dataset.playerPersona=persona;
    canvas.dataset.gesture = player.gesture || "idle";
    canvas.dataset.motionRig='original-svg-segments';
    canvas.dataset.jumpHeight=characterMotion(player,sceneTime/1000,motion.matches).lift.toFixed(1);
    canvas.dataset.pan = pan.toFixed(1);
    canvas.dataset.heartCount = String(hearts.length);
    canvas.dataset.blessingArrivals = String(blessingArrivals);
    canvas.dataset.blessingTargets = actors
      .slice(0, 2)
      .map((actor) => actor.name)
      .join(",");
    canvas.dataset.appearance = JSON.stringify(player.appearance);
    canvas.dataset.emotion = emotion?.id || "";
    canvas.dataset.temporaryHead=emotion?.id||'';
    canvas.dataset.people=JSON.stringify(actors.map(a=>({name:a.name,username:a.username||null,npc:!!a.npc,kind:a.kind||'visitor',x:a.x,y:a.y,walking:!!a.walking,action:a.kind==='juggler'?'juggle':a.gesture||a.ambientAction||'idle',heldItem:a.heldItem?.id||'',formalStyle:a.appearance.formalStyle,formalColor:a.appearance.formalColor,appearance:a.username==='lqc'||a.username==='shenqidayang'?a.appearance:undefined})));
    const juggler=actors.find(a=>a.kind==='juggler');
    if(onScreen(juggler))canvas.dataset.juggling=JSON.stringify(jugglerArt.frame(sceneTime/1000,motion.matches).map(p=>({id:p.id,x:juggler.x+p.x,y:juggler.y+p.y,airborne:p.airborne})));
    canvas.dataset.heldItem=player.heldItem?.id||'';
    canvas.dataset.carryMode=carryMode(player.gesture?null:player.heldItem);
    canvas.dataset.cats = JSON.stringify(cats.map(({ id, x, y, reactingUntil, state, personality, activity, stride, facing }) => ({
      id, x: worldLeft() + x * scale, y: worldTop() + (y - 29) * scale,
      worldX: x, worldY: y, state, personality, activity, stride, facing,
      reacting: reactingUntil > sceneTime,
    })));
  }
  function tick(now) {
    if (disposed) return;
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    if (document.hidden) return;
    sceneTime += dt * 1000;
    if (emotion && now >= emotion.until) { emotion = null; dirty = true; }
    let animate = !!destination || !!player.gesture || hearts.length > 0 || sceneTime < locateUntil;
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
    const florist=actors.find(actor=>actor.kind==='florist');
    if(florist){
      const cycle=Math.floor(sceneTime/11400),phase=sceneTime%11400;
      const action=!motion.matches&&phase<6400?(cycle%2?'dance-twist':'dance-sway'):'';
      if(florist.ambientAction!==action){florist.ambientAction=action;florist.ambientStarted=cycle*11.4;dirty=true;}
      animate=(!!action&&onScreen(florist))||animate;
    }
    animate = ambient.update(dt,sceneTime,motion.matches,!!destination,onScreen) || animate;
    const juggler=actors.find(a=>a.kind==='juggler'),jugglerVisible=onScreen(juggler);
    animate=(!motion.matches&&jugglerVisible)||animate;
    animate = catArt.update(dt, sceneTime, actors, player, motion.matches) || animate;
    if (player.gesture && sceneTime >= gestureUntil) {
      player.gesture = "";
      dirty = true;
    }
    if (dirty || animate) {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(worldLeft(), worldTop());
      ctx.scale(scale, scale);
      ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
      giftArt.drawBackdrop(ctx);
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
        else {art.draw(ctx, actor===player&&emotion?{...actor,appearance:emotion.appearance}:actor, sceneTime / 1000, motion.matches);if(actor.kind==='juggler'&&jugglerVisible)jugglerArt.draw(ctx,actor,sceneTime/1000,motion.matches);}
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
        ctx.scale(22, 22);
        ctx.globalAlpha = Math.min(1, t * 7, (1 - t) * 8);
        ctx.fillStyle = "#d87c90";
        ctx.beginPath();
        ctx.moveTo(0, 0.7);
        ctx.bezierCurveTo(-1.4, -0.1, -0.8, -1.2, 0, -0.55);
        ctx.bezierCurveTo(0.8, -1.2, 1.4, -0.1, 0, 0.7);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      if (dirty || now - lastLabels > 33) {
        labels();
        lastLabels = now;
      }
      dirty = false;
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
  return {
    approach(station) {
      setDestination(station.x, station.y);
      if(station.id==='payment'){
        const focusX=(station.x+jugglerPosition.x)/2;
        pan=width/2-((width-WIDTH*scale)/2+focusX*scale);constrainPan();dirty=true;
      }
    },
    stopApproach() { destination=null;route=[];player.walking=false;dirty=true; },
    async carry(id){
      const version=++carryVersion,item=id?items.find(i=>i.id===id&&i.uses.includes('handheld')):null;
      if(id&&!item)return false;
      await art.ensureHeldItem(item);
      if(disposed||version!==carryVersion)return false;
      player.heldItem=item;player.gesture='';player.ambientAction='';
      ambient.interrupt(sceneTime);player.direction='front';dirty=true;return true;
    },
    async express(id) {
      const item = emojiHeads.find(e => e.id === id);
      if (!item || disposed) return false;
      const version = ++emotionVersion;
      let base,temporary;
      do{base=player.appearance;temporary=await art.ensureAppearance({...base,animalHead:id});if(disposed||version!==emotionVersion)return false;}while(base!==player.appearance);
      emotion = { id, label: item.label, appearance:temporary, until: performance.now()+5000 };
      ambient.interrupt(sceneTime);
      dirty = true;
      return true;
    },
    petCat,
    gesture(kind) {
      ambient.interrupt(sceneTime);
      if (!["walk", "clap", "bless", "wave", "jump", "stretch", "scratch", "sway",...danceMoves.map(p=>p.id)].includes(kind)) return false;
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
      if (kind === "bless") {
        // The two closest cats join in; repeated clicks cannot stack reactions.
        catArt.bless(player);
        blessingArrivals = 0;
        for (const [index, recipient] of actors.slice(0, 2).entries())
          hearts.push({
            from: { x: player.x, y: player.y - 75 },
            to: { x: recipient.x, y: recipient.y - 75 },
            control: {
              x: (player.x + recipient.x) / 2 + (index ? 110 : -110),
              y: Math.min(player.y, recipient.y) - 125,
            },
            start: sceneTime + 250 + index * 180,
            duration: 1700,
          });
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
      emotionVersion++;
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
    },
  };
}
