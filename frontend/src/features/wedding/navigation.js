import area from './walkable-area.json' with { type: 'json' };

const EPS = 1e-7;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function createNavigation(area) {
  const boundary = area.points.map(([x, y]) => ({
    x: x * area.world.width / area.width, y: y * area.world.height / area.height,
  }));
  const edges = boundary.map((a, i) => [a, boundary[(i + 1) % boundary.length]]);
  function projection(p, a, b) {
    const ab = sub(b, a), ap = sub(p, a);
    const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / (ab.x ** 2 + ab.y ** 2)));
    return { x: a.x + ab.x * t, y: a.y + ab.y * t };
  }
  function isWalkable(p) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
    let inside = false;
    for (const [a, b] of edges) {
      if (distance(p, projection(p, a, b)) < EPS) return true;
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function nearestWalkable(p) {
    if (isWalkable(p)) return { x: p.x, y: p.y };
    return edges.map(([a, b]) => projection(p, a, b)).reduce((a, b) => distance(a, p) < distance(b, p) ? a : b);
  }
  // Split at every boundary crossing, including collinear edges. Checking every
  // interval prevents even a narrow concave notch from being skipped by sampling.
  function segmentWalkable(a, b) {
    if (!isWalkable(a) || !isWalkable(b)) return false;
    const r = sub(b, a), length2 = r.x ** 2 + r.y ** 2;
    if (length2 < EPS) return true;
    const times = [0, 1];
    for (const [c, d] of edges) {
      const s = sub(d, c), ca = sub(c, a), denominator = cross(r, s);
      if (Math.abs(denominator) > EPS) {
        const t = cross(ca, s) / denominator, u = cross(ca, r) / denominator;
        if (t > 0 && t < 1 && u >= -EPS && u <= 1 + EPS) times.push(t);
      } else if (Math.abs(cross(ca, r)) < EPS) {
        for (const p of [c, d]) {
          const q = sub(p, a), t = (q.x * r.x + q.y * r.y) / length2;
          if (t > 0 && t < 1) times.push(t);
        }
      }
    }
    times.sort((a, b) => a - b);
    return times.slice(1).every((t, i) => {
      const mid = (times[i] + t) / 2;
      return isWalkable({ x: a.x + r.x * mid, y: a.y + r.y * mid });
    });
  }
  let graph;
  function walkingRoute(start, target) {
    const goal = nearestWalkable(target);
    if (!isWalkable(start)) return null;
    if (segmentWalkable(start, goal)) return [goal];
    // The polygon is static; cache visibility between its corners.
    graph ??= boundary.map((a, i) => boundary.flatMap((b, j) => i !== j && segmentWalkable(a, b) ? [j] : []));
    const nodes = [...boundary, start, goal], first = boundary.length, last = first + 1;
    const links = graph.map(row => [...row]);
    links.push([], []);
    for (let i = 0; i < first; i++) for (const j of [first, last]) {
      if (segmentWalkable(nodes[i], nodes[j])) { links[i].push(j); links[j].push(i); }
    }
    const costs = nodes.map(() => Infinity), parents = [], open = new Set([first]);
    costs[first] = 0;
    while (open.size) {
      const current = [...open].reduce((a, b) => costs[a] < costs[b] ? a : b);
      if (current === last) {
        const result = [];
        for (let i = last; i !== first; i = parents[i]) result.unshift(nodes[i]);
        return result;
      }
      open.delete(current);
      for (const next of links[current]) {
        const cost = costs[current] + distance(nodes[current], nodes[next]);
        if (cost + EPS < costs[next]) { costs[next] = cost; parents[next] = current; open.add(next); }
      }
    }
    return null;
  }

  return {boundary,isWalkable,nearestWalkable,segmentWalkable,walkingRoute};
}
export const {boundary,isWalkable,nearestWalkable,segmentWalkable,walkingRoute}=createNavigation(area);
