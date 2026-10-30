import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boundary, isWalkable, nearestWalkable, segmentWalkable, walkingRoute } from '../src/features/wedding/navigation.js';

test('source polygon maps into world space and includes the marked stage', () => {
  const data = JSON.parse(readFileSync(new URL('../../asset/wedding/background/walkable-area.json', import.meta.url)));
  assert.equal(boundary.length, 60);
  assert.equal(boundary[0].x, data.points[0][0] * 1600 / 1672);
  assert.equal(boundary[0].y, data.points[0][1] * 900 / 941);
  assert.ok(isWalkable({ x: 800, y: 300 }));
  assert.ok(!isWalkable({ x: 50, y: 850 }));
  assert.ok(!isWalkable({ x: NaN, y: 300 }));
});

test('outside clicks project to valid ground and routes never cut concave corners', () => {
  let detours = 0;
  for (let i = 0; i < boundary.length; i += 3) {
    const start = boundary[i], goal = boundary[(i + 19) % boundary.length];
    const path = walkingRoute(start, goal);
    assert.ok(path?.length);
    if (!segmentWalkable(start, goal)) { assert.ok(path.length > 1); detours++; }
    let previous = start;
    for (const next of path) {
      assert.ok(segmentWalkable(previous, next));
      for (let j = 0; j <= 100; j++) assert.ok(isWalkable({ x: previous.x + (next.x - previous.x) * j / 100, y: previous.y + (next.y - previous.y) * j / 100 }));
      previous = next;
    }
  }
  assert.ok(detours > 0);
  for (const p of [{x:-100,y:500},{x:1700,y:1000},{x:800,y:0}]) {
    assert.ok(isWalkable(nearestWalkable(p)));
    assert.ok(walkingRoute({x:800,y:750},p)?.length);
  }
});
