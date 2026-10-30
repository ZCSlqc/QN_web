import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCatLife, chooseActivity, catRoute, inGarden, moving, faceTarget } from '../src/features/wedding/catLife.js';
const configs = JSON.parse(readFileSync(new URL('../../backend/app/core/wedding_cats.json', import.meta.url), 'utf8'));
function seeded(seed = 123) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
const player = { x: 800, y: 750, player: true };
const actors = [player, ...[[450,490],[600,530],[1000,530],[1150,490],[430,710],[590,700],[1010,700],[1170,710]].map(([x,y])=>({x,y}))];

test('facing has a centre dead zone and cooldown, while walking can turn sooner', () => {
  const cat=createCatLife(configs).cats[0];
  assert.equal(faceTarget(cat,{x:cat.x-60},0),true);
  assert.equal(cat.facing,-1);
  assert.equal(faceTarget(cat,{x:cat.x+60},500),false);
  assert.equal(faceTarget(cat,{x:cat.x+10},1500),false);
  assert.equal(faceTarget(cat,{x:cat.x+60},1500),true);
  assert.equal(faceTarget(cat,{x:cat.x-60},1600,true),false);
  assert.equal(faceTarget(cat,{x:cat.x-60},1800,true),true);
});

test('petting turns even a resting cat toward the visitor without repeated flipping', () => {
  const life=createCatLife(configs,seeded());
  const cat=life.cats.find(c=>c.id==='anan');
  const visitor={x:cat.x-70,y:cat.y+100};
  life.pet(cat.id,visitor);
  assert.equal(cat.facing,-1);
  visitor.x=cat.x+70;
  life.update(.05,500,[visitor],visitor,true);
  assert.equal(cat.facing,-1);
  life.update(.05,1100,[visitor],visitor,true);
  assert.equal(cat.facing,1);
});

test('idle attention follows personality and reduced motion suppresses autonomous turns', () => {
  const life=createCatLife(configs,seeded());
  for(const cat of life.cats){cat.nextDecision=99999;cat.lookAfter=0;cat.facing=1;cat.state='sit';}
  const visitor={x:700,y:450};
  const lazy=life.cats.find(c=>c.id==='anan'); lazy.state='lie';
  life.update(.05,1500,[visitor],visitor);
  assert.equal(life.cats[0].facing,-1);
  assert.equal(lazy.facing,1);
  life.update(.05,1600,[visitor],visitor,true);
  const facings=life.cats.map(c=>c.facing);
  visitor.x=1100;
  life.update(.05,5000,[visitor],visitor,true);
  assert.deepEqual(life.cats.map(c=>c.facing),facings);
});

test('weighted choices reflect personality rather than uniform random behavior', () => {
  const random = seeded();
  for (const cat of configs) {
    const counts = { rest:0, explore:0, social:0, approach:0 };
    for(let i=0;i<20000;i++) counts[chooseActivity(cat,random)]++;
    for(const key in counts) assert.ok(Math.abs(counts[key]/200 - cat[`${key}_weight`]) < 2);
  }
});

test('long simulation stays walkable, avoids bodies and limits simultaneous movement', () => {
  const life = createCatLife(configs, seeded());
  const travelled = Object.fromEntries(configs.map(c=>[c.id,0]));
  for(let i=1;i<=5000;i++) {
    life.update(.05,i*50,actors,player);
    assert.ok(life.cats.filter(moving).length<=3);
    assert.ok(life.cats.filter(c=>c.state==='trot').length<=1);
    for (const cat of life.cats) {
      assert.ok(inGarden(cat), `${cat.id} outside garden`);
      assert.ok(actors.every(a=>Math.hypot(a.x-cat.x,a.y-cat.y)>=39.99), `${cat.id} crossed a person`);
      assert.ok(life.cats.every(c=>c===cat||Math.hypot(c.x-cat.x,c.y-cat.y)>=47.99), `${cat.id} crossed another cat`);
      travelled[cat.id]=cat.stride;
    }
  }
  assert.ok(Object.values(travelled).every(d=>d>50));
  assert.ok(travelled.huahua>travelled.anan);
});

test('routes go around obstacles and reject unmarked ground', () => {
  const blocks=[{x:800,y:550,radius:65}];
  const path=catRoute({x:650,y:550},{x:950,y:550},blocks);
  assert.ok(path?.length>1);
  assert.equal(catRoute({x:650,y:550},{x:20,y:300},blocks),null);
  assert.ok(catRoute({x:650,y:550},{x:800,y:300},blocks));
});

test('petting interrupts movement, promotes affection, and reduced motion freezes autonomous travel', () => {
  const life=createCatLife(configs,seeded());
  for(let i=1;i<100;i++)life.update(.05,i*50,actors,player);
  const cat=life.pet('liuyi');
  assert.equal(moving(cat),false); assert.equal(cat.state,'greet');
  assert.ok(cat.familiarUntil>24000);
  life.update(.05,5000,actors,player,true);
  const positions=life.cats.map(c=>[c.x,c.y]);
  for(let i=101;i<300;i++)life.update(.05,i*50,actors,player,true);
  assert.deepEqual(life.cats.map(c=>[c.x,c.y]),positions);
  life.bless(player);
  assert.equal(life.cats.filter(c=>c.reactingUntil>14950).length,2);
});

test('clingy cat approaches the visitor after petting; shy cat retreats with a cooldown', () => {
  const quiet=configs.map(c=>({...c,rest_weight:100,explore_weight:0,social_weight:0,approach_weight:0}));
  const life=createCatLife(quiet,seeded(12));
  const visitor={x:800,y:700};
  const liuyi=life.pet('liuyi');
  const before=Math.hypot(liuyi.x-visitor.x,liuyi.y-visitor.y);
  for(let i=1;i<=200;i++)life.update(.05,i*50,[visitor],visitor);
  assert.ok(Math.hypot(liuyi.x-visitor.x,liuyi.y-visitor.y)<before-120);
  const shyLife=createCatLife(quiet,seeded(5));
  const guagua=shyLife.cats.find(c=>c.id==='guagua');
  const stranger={x:guagua.x-60,y:guagua.y};
  for(let i=1;i<=40;i++)shyLife.update(.05,i*50,[stranger],stranger);
  assert.ok(Math.hypot(guagua.x-stranger.x,guagua.y-stranger.y)>110);
  assert.ok(guagua.retreatUntil>2000);
});
