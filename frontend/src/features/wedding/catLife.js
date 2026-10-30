// Local simulation: only persistent NPC configuration comes from the server.
import { isWalkable, segmentWalkable, nearestWalkable, boundary } from './navigation.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const moving = (cat) => !!cat.path?.length;
export const personalityNames = { playful: "活泼", shy: "胆小", lazy: "慵懒", alert: "警惕", clingy: "粘人" };
// A dead zone around the centre prevents tiny target movements from flipping a sprite.
export function faceTarget(cat, target, time, walking = false) {
  if (!target || Math.abs(target.x - cat.x) < (walking ? 8 : 18) || time - cat.lastTurnAt < (walking ? 220 : 1000)) return false;
  const facing = target.x < cat.x ? -1 : 1;
  if (facing === cat.facing) return false;
  cat.facing = facing;
  cat.lastTurnAt = time;
  return true;
}
export function inGarden(p) {
  return isWalkable(p);
}

function obstacles(cat, cats, actors) {
  return [...actors.map((p) => ({ ...p, radius: 40 })),
    ...cats.filter((p) => p !== cat).map((p) => ({ x: p.x, y: p.y, radius: 48 }))];
}
function clearPoint(p, blocks) {
  return inGarden(p) && blocks.every((b) => distance(p, b) >= b.radius);
}
function clearLine(a, b, blocks) {
  if (!segmentWalkable(a, b)) return false;
  const count = Math.max(1, Math.ceil(distance(a, b) / 10));
  for (let i = 1; i <= count; i++) {
    const p = { x: a.x + (b.x - a.x) * i / count, y: a.y + (b.y - a.y) * i / count };
    // An approaching visitor may enter the personal space of a resting cat.
    // Permit escape only when each step increases the separation.
    if (blocks.some((o) => distance(p, o) < o.radius && distance(p, o) <= distance(a, o))) return false;
  }
  return true;
}

const bounds = { left: Math.min(...boundary.map(p => p.x)), right: Math.max(...boundary.map(p => p.x)),
  top: Math.min(...boundary.map(p => p.y)), bottom: Math.max(...boundary.map(p => p.y)) };
const gardenNodes = [];
for (let y = bounds.top; y <= bounds.bottom; y += 30) for (let x = bounds.left; x <= bounds.right; x += 30) {
  if (inGarden({ x, y })) gardenNodes.push({ x, y });
}
// A* uses the same annotated boundary as the player, plus dynamic body avoidance.
export function catRoute(start, goal, blocks = []) {
  if (!clearPoint(goal, blocks)) return null;
  if (clearLine(start, goal, blocks)) return [goal];
  const nodes = [];
  for (const p of gardenNodes) if (clearPoint(p, blocks)) nodes.push(p);
  nodes.push({ x: start.x, y: start.y }, goal);
  const first = nodes.length - 2, last = first + 1;
  const open = new Set([first]), cost = new Map([[first, 0]]), parent = new Map();
  while (open.size) {
    const current = [...open].reduce((a, b) =>
      cost.get(a) + distance(nodes[a], goal) < cost.get(b) + distance(nodes[b], goal) ? a : b);
    if (current === last) {
      const path = [];
      for (let n = last; n !== first; n = parent.get(n)) path.unshift(nodes[n]);
      return path;
    }
    open.delete(current);
    for (let n = 0; n < nodes.length; n++) {
      if (n === current) continue;
      const d = distance(nodes[current], nodes[n]);
      if (d > (current === first || n === last ? 75 : 43)) continue;
      const nextCost = cost.get(current) + d;
      if (nextCost >= (cost.get(n) ?? Infinity) || !clearLine(nodes[current], nodes[n], blocks)) continue;
      cost.set(n, nextCost); parent.set(n, current); open.add(n);
    }
  }
  return null;
}

export function chooseActivity(cat, random = Math.random) {
  const entries = ["rest", "explore", "social", "approach"].map((key) =>
    [key, cat[`${key}_weight`] * (cat.lastActivity === key && cat.repeats >= 2 ? 0.35 : 1)]);
  let value = random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [key, weight] of entries) { value -= weight; if (value < 0) return key; }
  return "rest";
}

export function createCatLife(configs, random = Math.random) {
  const cats = configs.map((c, i) => ({ ...c, ...nearestWalkable({ x: c.home_x, y: c.home_y }), cat: true,
    state: "sit", activity: "rest", path: [], facing: c.home_x > 800 ? -1 : 1, stride: 0, reactingUntil: 0,
    lastTurnAt: -Infinity, lookAfter: 1200 + i * 500, attention: null, attentionUntil: 0,
    nextDecision: 1800 + i * 850, until: 0, familiarUntil: 0, retreatUntil: 0,
    repeats: 0, lastActivity: "", transition: 0, previousPose: "sit" }));
  let time = 0, reduced = false;
  function pose(cat, state) {
    if (cat.state === state) return;
    cat.previousPose = cat.state; cat.transition = time; cat.state = state;
  }
  function stop(cat, state = "sit", duration = 2500) {
    cat.path = []; cat.target = null; pose(cat, state); cat.until = 0;
    cat.nextDecision = time + duration;
  }
  function attend(cat, target, duration = 3500) {
    cat.attention = target; cat.attentionUntil = time + duration;
    faceTarget(cat, target, time);
  }
  function react(cat, pet = false, source = null) {
    stop(cat, "greet", 2600);
    attend(cat, source);
    cat.reactingUntil = time + 2400;
    if (pet) cat.familiarUntil = time + (cat.personality === "clingy" ? 24000 : 10000);
  }
  function start(cat, goal, activity, actors, target = null) {
    if (cats.filter(moving).length >= 3 || distance(cat, goal) < 12) return false;
    const route = catRoute(cat, goal, obstacles(cat, cats, actors));
    if (!route) return false;
    cat.attention = null;
    cat.path = route; cat.target = target; cat.activity = activity;
    const trot = cat.personality === "playful" && activity !== "approach" &&
      !cats.some((c) => c.state === "trot") && random() < 0.6;
    pose(cat, trot ? "trot" : "walk");
    cat.until = time + 10000;
    cat.replanAt = time + 1000;
    return true;
  }
  function nearTarget(cat, target, actors, activity) {
    const gap = cat.personality === "shy" || cat.personality === "alert" ? 85 : 58;
    for (let i = 0; i < 8; i++) {
      const angle = Math.atan2(cat.y - target.y, cat.x - target.x) + i * Math.PI / 4;
      const goal = { x: target.x + Math.cos(angle) * gap, y: target.y + Math.sin(angle) * gap };
      if (start(cat, goal, activity, actors, target)) return true;
    }
    return false;
  }
  function decide(cat, actors, player) {
    let activity = chooseActivity(cat, random);
    if (cat.personality === "clingy" && cat.familiarUntil > time) activity = "approach";
    cat.repeats = activity === cat.lastActivity ? cat.repeats + 1 : 1;
    cat.lastActivity = activity; cat.activity = activity;
    if (activity === "rest") {
      stop(cat, cat.personality === "lazy" || random() < 0.3 ? "lie" : "observe",
        (cat.rest_min + random() * (cat.rest_max - cat.rest_min)) * 1000);
      return;
    }
    if (activity === "approach") {
      const target = cat.personality === "clingy" && random() < 0.85 ? player : actors[Math.floor(random() * actors.length)];
      if (target && nearTarget(cat, target, actors, activity)) return;
    } else if (activity === "social") {
      const peers = cats.filter((c) => c !== cat && (cat.personality !== "shy" || c.personality !== "playful"));
      const target = peers[Math.floor(random() * peers.length)];
      if (target && nearTarget(cat, target, actors, activity)) return;
    } else {
      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = random() * Math.PI * 2, radius = 55 + random() * cat.roam_radius;
        const origin = cat.personality === "clingy" ? { x: cat.home_x, y: cat.home_y } : cat;
        const goal = { x: clamp(origin.x + Math.cos(angle) * radius, bounds.left, bounds.right),
          y: clamp(origin.y + Math.sin(angle) * radius, bounds.top, bounds.bottom) };
        // Timid cats prefer the quieter edges; alert cats pause between short patrols.
        if (cat.personality === "shy") goal.x = goal.x < 800 ? Math.min(goal.x, 620) : Math.max(goal.x, 980);
        if (start(cat, goal, activity, actors)) return;
      }
    }
    stop(cat, "observe", 1800 + random() * 1200);
  }
  function observe(cat, actors, player) {
    if (time < cat.lookAfter || cat.state === "lie") return false;
    cat.lookAfter = time + ({ alert: 1500, clingy: 1100, playful: 2200, shy: 2600, lazy: 9000 }[cat.personality] || 3000);
    if (cat.attention && time < cat.attentionUntil) return faceTarget(cat, cat.attention, time);
    if (cat.personality === "lazy") return false;
    if (cat.personality === "clingy" && distance(cat, player) < 380) return faceTarget(cat, player, time);
    const candidates = (cat.personality === "playful" ? cats.filter(c => c !== cat) :
      [...actors, ...cats.filter(c => c !== cat && moving(c))])
      .filter(p => distance(cat, p) < (cat.personality === "alert" ? 300 : 220));
    candidates.sort((a, b) => distance(a, cat) - distance(b, cat));
    // Alert cats alternate attention between actual neighbours when possible.
    const target = cat.personality === "alert" ?
      candidates.find(p => Math.abs(p.x - cat.x) >= 18 && Math.sign(p.x - cat.x) !== cat.facing) || candidates[0] : candidates[0];
    return faceTarget(cat, target, time);
  }
  return {
    cats,
    reservePet(id,player){const cat=cats.find(c=>c.id===id);if(cat){stop(cat,'sit',20000);cat.familiarUntil=Math.max(cat.familiarUntil,time+20000);attend(cat,player);}return cat;},
    pet(id, player) { const cat = cats.find((c) => c.id === id); if (cat) react(cat, true, player); return cat; },
    bless(player) { [...cats].sort((a, b) => distance(a, player) - distance(b, player)).slice(0, 2).forEach((c) => react(c, false, player)); },
    update(dt, now, actors, player, reduce = false, ready = () => true) {
      time = now;
      let changed = false;
      if (reduce !== reduced) {
        reduced = reduce;
        for (const cat of cats) stop(cat, "sit", 2200);
        changed = true;
      }
      for (const cat of cats) {
        if (cat.reactingUntil && cat.reactingUntil <= time) { cat.reactingUntil = 0; pose(cat, "sit"); changed = true; }
        if (cat.reactingUntil || time - cat.transition < 200) changed = true;
        if (cat.reactingUntil) changed = faceTarget(cat, cat.attention, time) || changed;
        if (reduced || cat.reactingUntil || !ready(cat)) continue;
        const danger = [player, ...cats.filter((c) => c.state === "trot")].find((p) => p !== cat && distance(cat, p) < 95);
        if (cat.personality === "shy" && danger && cat.familiarUntil <= time && cat.retreatUntil <= time) {
          const angle = Math.atan2(cat.y - danger.y, cat.x - danger.x);
          stop(cat, "observe", 3000);
          start(cat, { x: cat.x + Math.cos(angle) * 85, y: cat.y + Math.sin(angle) * 85 }, "retreat", actors, danger);
          cat.retreatUntil = time + 8000; changed = true;
        }
        if (moving(cat)) {
          changed = true;
          if (time >= cat.until) { stop(cat, "observe", 2000); continue; }
          if (cat.target && time >= cat.replanAt && cat.personality === "clingy") {
            const target = cat.target;
            cat.replanAt = time + 1200;
            if (distance(cat.path.at(-1), target) > 105) {
              cat.path = [];
              if (!nearTarget(cat, target, actors, "approach")) stop(cat, "observe", 1600);
              continue;
            }
          }
          const goal = cat.path[0], d = distance(cat, goal),
            step = Math.min(d, dt * cat.speed * (cat.state === "trot" ? 1.55 : 1));
          const next = d > 0 ? { x: cat.x + (goal.x - cat.x) * step / d, y: cat.y + (goal.y - cat.y) * step / d } : goal;
          if (!clearLine(cat, next, obstacles(cat, cats, actors))) { stop(cat, "observe", 1000 + random() * 1500); continue; }
          faceTarget(cat, goal, time, true);
          cat.x = next.x; cat.y = next.y; cat.stride += step;
          if (d <= step + 0.1) cat.path.shift();
          if (!moving(cat)) {
            const target = cat.target, activity = cat.activity;
            stop(cat, activity === "social" || activity === "approach" ? "greet" : "observe", 2500 + random() * 1800);
            if (target) attend(cat, target);
            if (activity === "social" && target?.cat && !moving(target) && target.personality !== "lazy" && !target.reactingUntil) {
              stop(target, "greet", 1800);
              attend(target, cat);
            }
          }
        } else {
          changed = observe(cat, actors, player) || changed;
          if (time >= cat.nextDecision) { decide(cat, actors, player); changed = true; }
        }
      }
      return changed;
    },
  };
}
