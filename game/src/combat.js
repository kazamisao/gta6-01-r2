// Combat: punching and shooting. No gore — a pedestrian who is knocked
// down drops cash and gets up later; a car that is shot out smokes and stops.
import { PLAYER, WANTED } from './config.js';
import { circlesHit } from './physics.js';

export function punch(state) {
  const p = state.player;
  if (p.punchCooldown > 0 || p.inCar) return null;
  p.punchCooldown = PLAYER.punchCooldown;
  p.punchAnim = 0.18;
  // Nearest pedestrian in front of the player.
  let best = null;
  let bestD = PLAYER.punchRange + 14;
  for (const ped of state.peds) {
    if (ped.down > 0) continue;
    const dx = ped.x - p.x;
    const dy = ped.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < bestD) { best = ped; bestD = d; }
  }
  if (best) {
    best.down = 4;
    best.hp = 0;
    dropCash(state, best.x, best.y, 20 + Math.floor(Math.random() * 30));
    return { type: 'heat', amount: WANTED.assaultHeat, sound: 'punch' };
  }
  return { type: 'sound', name: 'punch' };
}

export function fireBullet(state, angle) {
  const p = state.player;
  if (p.inCar || p.shootCooldown > 0) return null;
  p.shootCooldown = 0.28;
  p.aimAngle = angle;
  state.bullets.push({
    x: p.x + Math.cos(angle) * 20,
    y: p.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * 900,
    vy: Math.sin(angle) * 900,
    life: 0.9,
  });
  spawnParticle(state, p.x + Math.cos(angle) * 26, p.y + Math.sin(angle) * 26, 'muzzle');
  return { type: 'sound', name: 'shot' };
}

export function dropCash(state, x, y, amount) {
  state.pickups.push({ x, y, amount, kind: 'cash', bob: Math.random() * 6 });
}

export function spawnParticle(state, x, y, kind) {
  state.particles.push({ x, y, kind, life: kind === 'smoke' ? 1.2 : 0.35, max: kind === 'smoke' ? 1.2 : 0.35 });
}

/** Move bullets, resolve hits on pedestrians, police and convoy cars. */
export function stepBullets(state, dt) {
  const events = [];
  const alive = [];
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    let hit = false;
    for (const ped of state.peds) {
      if (ped.down > 0) continue;
      if (circlesHit(b, 4, ped, 12)) {
        ped.down = 4;
        ped.hp = 0;
        dropCash(state, ped.x, ped.y, 25 + Math.floor(Math.random() * 40));
        events.push({ type: 'heat', amount: WANTED.killHeat, sound: 'shot' });
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (const cop of state.police) {
        if (cop.onFoot && cop.hp > 0 && circlesHit(b, 4, cop, 13)) {
          cop.hp -= 34;
          if (cop.hp <= 0) {
            cop.down = 5;
            dropCash(state, cop.x, cop.y, 50);
            events.push({ type: 'heat', amount: WANTED.copKillHeat, sound: 'shot' });
          }
          hit = true;
          break;
        }
      }
    }
    if (!hit) {
      for (const convoy of state.convoy) {
        if (convoy.stopped) continue;
        if (circlesHit(b, 4, convoy, 30)) {
          convoy.hp -= 12;
          spawnParticle(state, b.x, b.y, 'spark');
          if (convoy.hp <= 0) {
            convoy.stopped = true;
            events.push({ type: 'convoy-stopped' });
          }
          hit = true;
          break;
        }
      }
    }
    if (!hit) alive.push(b);
  }
  state.bullets = alive;
  return events;
}
