// The city itself: a road grid, the blocks between the roads, the buildings
// inside them, and the named places. Pure data — no drawing, no browser.
// A seeded build always makes the same city.
import { CITY, DISTRICTS, LANDMARKS, PALETTE, ROADS } from './config.js';
import { mulberry32, pick, range } from './random.js';

const HALF_ROAD = CITY.roadWidth / 2;
const ROOFS = [PALETTE.buildingRoof, PALETTE.buildingRoof2, PALETTE.buildingRoof3];

/** Column intervals between the avenues (the first is the beach strip). */
function columnIntervals() {
  const edges = [0, ...ROADS.avenues, CITY.size];
  const out = [];
  for (let i = 0; i < edges.length - 1; i++) out.push([edges[i], edges[i + 1]]);
  return out;
}

export function isOnRoad(x, y) {
  for (const a of ROADS.avenues) if (Math.abs(x - a) < HALF_ROAD) return true;
  for (const s of ROADS.streets) if (Math.abs(y - s) < HALF_ROAD) return true;
  return false;
}

/** Snap a point onto the nearest road centreline. */
export function nearestRoadPoint(x, y) {
  let ax = ROADS.avenues[0];
  for (const a of ROADS.avenues) if (Math.abs(a - x) < Math.abs(ax - x)) ax = a;
  let sy = ROADS.streets[0];
  for (const s of ROADS.streets) if (Math.abs(s - y) < Math.abs(sy - y)) sy = s;
  return Math.abs(ax - x) < Math.abs(sy - y) ? { x: ax, y } : { x, y: sy };
}

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const parks = [];
  const cols = columnIntervals();
  const rows = columnIntervals();

  for (let ci = 1; ci < cols.length; ci++) {
    for (let ri = 0; ri < rows.length; ri++) {
      const [x0, x1] = cols[ci];
      const [y0, y1] = rows[ri];
      const bx0 = x0 + HALF_ROAD + 10;
      const by0 = y0 + HALF_ROAD + 10;
      const bx1 = x1 - HALF_ROAD - 10;
      const by1 = y1 - HALF_ROAD - 10;
      if (bx1 - bx0 < 60 || by1 - by0 < 60) continue;
      // Founders Plaza stays open, and a few blocks are parks.
      const cx = (bx0 + bx1) / 2;
      const cy = (by0 + by1) / 2;
      if (Math.abs(cx - 1800) < 150 && Math.abs(cy - 2100) < 150) {
        parks.push({ x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 });
        continue;
      }
      if (rng() < 0.09) {
        parks.push({ x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 });
        continue;
      }
      const count = 1 + Math.floor(rng() * 3);
      for (let n = 0; n < count; n++) {
        const w = range(rng, 60, 120);
        const h = range(rng, 60, 120);
        const x = range(rng, bx0, Math.max(bx0 + 1, bx1 - w));
        const y = range(rng, by0, Math.max(by0 + 1, by1 - h));
        buildings.push({
          x, y, w, h,
          height: range(rng, 16, 64),
          roof: pick(rng, ROOFS),
          downtown: cx > 1200 && cx < 2400 && cy > 900 && cy < 2400,
        });
      }
    }
  }

  const landmarkPos = {};
  for (const lm of LANDMARKS) landmarkPos[lm.id] = { x: lm.x, y: lm.y };

  return { buildings, parks, districts: DISTRICTS, landmarkPos, seed };
}

export function buildingAt(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b;
  }
  return null;
}

/** True when a circle of radius r touches any building. */
export function collideCircleBuildings(x, y, r, city) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

/** Push a circle out of any building it overlaps; returns the building hit, if any. */
export function resolveCircleBuildings(pos, r, city) {
  const b = collideCircleBuildings(pos.x, pos.y, r, city);
  if (!b) return null;
  const cx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(pos.y, b.y + b.h));
  let dx = pos.x - cx;
  let dy = pos.y - cy;
  const d = Math.hypot(dx, dy);
  if (d === 0) {
    // Centre inside the building: push out along the shortest side.
    const left = pos.x - b.x;
    const right = b.x + b.w - pos.x;
    const top = pos.y - b.y;
    const bottom = b.y + b.h - pos.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) pos.x = b.x - r;
    else if (m === right) pos.x = b.x + b.w + r;
    else if (m === top) pos.y = b.y - r;
    else pos.y = b.y + b.h + r;
    return b;
  }
  dx /= d;
  dy /= d;
  pos.x = cx + dx * r;
  pos.y = cy + dy * r;
  return b;
}
