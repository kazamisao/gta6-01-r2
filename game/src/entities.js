// The living city: the player on foot and in cars, traffic, pedestrians,
// police, the convoy, pickups and particles. One fixed step at a time;
// every interesting thing that happens comes back as an event for main.js.
import { CAR, CITY, LANDMARKS, MISSIONS, PLAYER, ROADS, TRAFFIC, WANTED } from './config.js';
import { mulberry32, pick, range } from './random.js';
import { buildCity, isOnRoad, nearestRoadPoint, resolveCircleBuildings } from './city.js';
import { addHeat, clearWanted, createWanted, decayWanted, wantedStars } from './wanted.js';
import { advanceMission, createMissions, currentMission, missionObjective } from './missions.js';
import { circlesHit, stepCar } from './physics.js';
import { dropCash, fireBullet, punch, spawnParticle, stepBullets } from './combat.js';

const CAR_COLORS = ['#c94b4b', '#4b7ac9', '#e8e0d0', '#58a86b', '#d8a04b', '#8e6ac9', '#c9c9c9'];
const PED_COLORS = ['#e8e0d0', '#7ab8c9', '#c97a7a', '#a8c97a', '#d8b84b', '#b89ad8'];

function landmark(id) {
  return LANDMARKS.find((l) => l.id === id);
}

function randomRoadCar(rng, city) {
  const avenue = rng() < 0.5;
  const line = pick(rng, avenue ? ROADS.avenues : ROADS.streets);
  const along = range(rng, 300, 3300);
  return {
    x: avenue ? line : along,
    y: avenue ? along : line,
    angle: avenue ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
    speed: 0,
    hp: 100,
    color: pick(rng, CAR_COLORS),
    parked: false,
    police: false,
    convoy: false,
    stopped: false,
    tuned: false,
    avenue,
    line,
    dir: rng() < 0.5 ? 1 : -1,
    cruise: range(rng, 110, 180),
  };
}

function randomPed(rng) {
  const avenue = rng() < 0.5;
  const line = pick(rng, avenue ? ROADS.avenues : ROADS.streets);
  const along = range(rng, 300, 3300);
  const off = (CITY.roadWidth / 2 + 14) * (rng() < 0.5 ? 1 : -1);
  return {
    x: avenue ? line + off : along,
    y: avenue ? along : line + off,
    angle: rng() * Math.PI * 2,
    speed: range(rng, 35, 65),
    hp: 100,
    down: 0,
    color: pick(rng, PED_COLORS),
    flee: 0,
    fleeX: 0,
    fleeY: 0,
    avenue,
    line,
    dir: rng() < 0.5 ? 1 : -1,
  };
}

export function createGame(seed) {
  const rng = mulberry32(seed);
  const city = buildCity(seed);
  const garage = landmark('garage');
  const state = {
    city,
    rng,
    seed,
    time: 0,
    player: {
      x: garage.x + 120, y: garage.y + 60, angle: -Math.PI / 2,
      hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
      inCar: false, car: null, punchCooldown: 0, shootCooldown: 0,
      punchAnim: 0, aimAngle: 0, arrestTimer: 0, invulnerable: 0,
    },
    cars: [],
    peds: [],
    police: [],
    convoy: [],
    bullets: [],
    pickups: [],
    particles: [],
    wanted: createWanted(),
    missions: createMissions(),
    camera: { x: garage.x + 120, y: garage.y + 60 },
    witness: { x: landmark('market').x, y: landmark('market').y, following: false, waiting: true },
    deedsTaken: false,
    convoySpawned: false,
    shopOpen: false,
    shopMsg: '',
    autosaveTimer: 0,
  };
  // A few parked cars near the start so the first steal is quick.
  for (let i = 0; i < 6; i++) {
    const c = randomRoadCar(rng, city);
    c.parked = true;
    c.speed = 0;
    c.x = garage.x + 40 + i * 90;
    c.y = garage.y - 40;
    c.angle = 0;
    state.cars.push(c);
  }
  for (let i = 0; i < TRAFFIC.cars; i++) state.cars.push(randomRoadCar(rng, city));
  for (let i = 0; i < TRAFFIC.pedestrians; i++) state.peds.push(randomPed(rng));
  return state;
}

function nearestCar(state, x, y, maxD) {
  let best = null;
  let bestD = maxD;
  for (const car of state.cars) {
    if (car.police || car.convoy) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

function spawnPolice(state) {
  const stars = wantedStars(state.wanted);
  const want = Math.min(stars + 1, 6);
  const rng = state.rng;
  while (state.police.length < want) {
    const rp = nearestRoadPoint(state.player.x + range(rng, -700, 700), state.player.y + range(rng, -700, 700));
    state.police.push({
      x: rp.x, y: rp.y, angle: 0, speed: 0, hp: 100,
      onFoot: false, down: 0, arrestTimer: 0, carHp: 120,
    });
  }
}

function stepTrafficCar(state, car, dt) {
  if (car.parked || car.stopped) return;
  // Slow down for the car ahead on the same line.
  let target = car.cruise;
  for (const other of state.cars) {
    if (other === car || other.parked) continue;
    if (other.avenue !== car.avenue || other.line !== car.line) continue;
    const ahead = car.avenue ? (other.y - car.y) * car.dir : (other.x - car.x) * car.dir;
    if (ahead > 0 && ahead < 110) { target = 40; break; }
  }
  car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
  const step = car.speed * car.dir * dt;
  if (car.avenue) car.y += step;
  else car.x += step;
  car.angle = car.avenue ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
  // At an intersection, sometimes turn onto the crossing road.
  const onLine = car.avenue ? car.y : car.x;
  const nearest = (car.avenue ? ROADS.streets : ROADS.avenues).find((v) => Math.abs(onLine - v) < 8);
  if (nearest !== undefined && state.rng() < 0.02) {
    car.avenue = !car.avenue;
    car.line = nearest;
    car.dir = state.rng() < 0.5 ? 1 : -1;
    if (car.avenue) car.x = car.line;
    else car.y = car.line;
  }
  if (car.x < 260 || car.x > CITY.size - 20 || car.y < 20 || car.y > CITY.size - 20) {
    car.dir *= -1;
  }
}

function stepPed(state, ped, dt) {
  if (ped.down > 0) {
    ped.down -= dt;
    if (ped.down <= 0) { ped.hp = 100; ped.flee = 0; }
    return;
  }
  let speed = ped.speed;
  let angle = ped.angle;
  if (ped.flee > 0) {
    ped.flee -= dt;
    speed = 250;
    angle = Math.atan2(ped.y - ped.fleeY, ped.x - ped.fleeX);
  } else {
    // Walk along the sidewalk of the current road.
    angle = ped.avenue ? (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (ped.dir > 0 ? 0 : Math.PI);
    const onLine = ped.avenue ? ped.y : ped.x;
    const nearest = (ped.avenue ? ROADS.streets : ROADS.avenues).find((v) => Math.abs(onLine - v) < 10);
    if (nearest !== undefined && state.rng() < 0.01) {
      ped.avenue = !ped.avenue;
      ped.line = nearest;
      ped.dir = state.rng() < 0.5 ? 1 : -1;
    }
  }
  ped.angle = angle;
  ped.x += Math.cos(angle) * speed * dt;
  ped.y += Math.sin(angle) * speed * dt;
  ped.x = Math.max(CITY.waterWidth + 10, Math.min(CITY.size - 20, ped.x));
  ped.y = Math.max(20, Math.min(CITY.size - 20, ped.y));
  // Keep pedestrians out of buildings.
  resolveCircleBuildings(ped, 12, state.city);
}

function stepPolice(state, cop, dt, events) {
  const p = state.player;
  if (cop.down > 0) {
    cop.down -= dt;
    return;
  }
  const dx = p.x - cop.x;
  const dy = p.y - cop.y;
  const dist = Math.hypot(dx, dy);
  if (!cop.onFoot) {
    // Drive at the player; ram the player's car.
    const want = Math.atan2(dy, dx);
    let diff = want - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
    cop.speed = Math.min(560, cop.speed + 380 * dt);
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    const hit = collideCircleBuildings(cop.x, cop.y, 30, state.city);
    if (hit) {
      cop.x -= Math.cos(cop.angle) * cop.speed * dt;
      cop.y -= Math.sin(cop.angle) * cop.speed * dt;
      cop.speed *= 0.4;
      cop.angle += 0.6;
    }
    if (p.inCar && p.car && circlesHit(cop, 30, p.car, 30)) {
      p.car.hp -= 14 * dt * 10;
      cop.speed *= 0.5;
      if (Math.random() < dt * 8) events.push({ type: 'sound', name: 'crash' });
      if (p.car.hp <= 0) {
        events.push({ type: 'car-wrecked' });
        p.car.stopped = true;
        p.inCar = false;
        p.car = null;
        p.x += 60;
        p.y += 60;
      }
    }
    // Close on foot: the cop gets out and chases.
    if (!p.inCar && dist < 130) {
      cop.onFoot = true;
      cop.speed = 0;
      events.push({ type: 'sound', name: 'siren' });
    }
  } else {
    // On foot: chase and arrest.
    const want = Math.atan2(dy, dx);
    cop.angle = want;
    const speed = 235;
    cop.x += Math.cos(want) * speed * dt;
    cop.y += Math.sin(want) * speed * dt;
    resolveCircleBuildings(cop, 13, state.city);
    if (dist < 34) {
      cop.arrestTimer += dt;
      if (cop.arrestTimer > 1.2) events.push({ type: 'busted' });
    } else {
      cop.arrestTimer = 0;
    }
  }
}

function spawnConvoy(state) {
  const rng = state.rng;
  for (let i = 0; i < 3; i++) {
    state.convoy.push({
      x: 700 + i * 130, y: 1800, angle: 0, speed: 150 + i * 12,
      hp: 100, color: '#1d1d24', police: false, convoy: true,
      stopped: false, tuned: false, avenue: false, line: 1800, dir: 1, cruise: 150,
    });
  }
  state.convoySpawned = true;
  void rng;
}

function stepConvoyCar(state, car, dt, events) {
  if (car.stopped) {
    if (state.rng() < dt * 2) spawnParticle(state, car.x, car.y - 20, 'smoke');
    return;
  }
  car.x += car.speed * dt;
  if (car.x > CITY.size - 100) car.x = 600;
  // The player's car ramming a convoy car damages it.
  const p = state.player;
  if (p.inCar && p.car && circlesHit(p.car, 30, car, 30)) {
    const impact = Math.abs(p.car.speed);
    if (impact > 140) {
      car.hp -= 18;
      p.car.hp -= 8;
      p.car.speed *= 0.5;
      events.push({ type: 'sound', name: 'crash' });
      spawnParticle(state, car.x, car.y, 'spark');
      if (car.hp <= 0) {
        car.stopped = true;
        events.push({ type: 'convoy-stopped' });
      }
    }
  }
}

/** One fixed step. controls: { move, sprint, throttle, steer, brake, interact, punch, shootAngle }. */
export function stepGame(state, controls, dt) {
  const events = [];
  const p = state.player;
  state.time += dt;

  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.shootCooldown > 0) p.shootCooldown -= dt;
  if (p.punchAnim > 0) p.punchAnim -= dt;
  if (p.invulnerable > 0) p.invulnerable -= dt;

  // --- The player ---
  if (p.inCar && p.car) {
    const car = p.car;
    stepCar(car, { throttle: controls.throttle, steer: controls.steer, brake: controls.brake }, dt, state.city);
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    if (Math.abs(car.speed) > 240 && state.rng() < dt * 6) {
      spawnParticle(state, car.x - Math.cos(car.angle) * 40, car.y - Math.sin(car.angle) * 40, 'skid');
    }
    if (controls.interact) {
      p.inCar = false;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 55;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 55;
      p.car = null;
      resolveCircleBuildings(p, PLAYER.radius, state.city);
    }
  } else {
    const speed = controls.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const mx = controls.move.x;
    const my = controls.move.y;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      p.x += (mx / len) * speed * dt;
      p.y += (my / len) * speed * dt;
      p.angle = Math.atan2(my, mx);
    }
    p.x = Math.max(CITY.waterWidth + 14, Math.min(CITY.size - 20, p.x));
    p.y = Math.max(20, Math.min(CITY.size - 20, p.y));
    resolveCircleBuildings(p, PLAYER.radius, state.city);
    if (controls.punch) {
      const ev = punch(state);
      if (ev) events.push(ev);
    }
    if (controls.shootAngle !== null && controls.shootAngle !== undefined) {
      const ev = fireBullet(state, controls.shootAngle);
      if (ev) events.push(ev);
    }
    if (controls.interact) {
      const car = nearestCar(state, p.x, p.y, 80);
      if (car) {
        const wasParked = car.parked;
        car.parked = false;
        p.inCar = true;
        p.car = car;
        p.x = car.x;
        p.y = car.y;
        events.push({ type: 'sound', name: 'pickup' });
        if (missionObjective(state.missions).id === 'm1-steal') {
          events.push({ type: 'mission', event: 'steal-car' });
          addHeat(state.wanted, WANTED.stealCarHeat);
        } else if (wasParked) {
          addHeat(state.wanted, WANTED.stealCarHeat / 2);
        }
      }
    }
  }

  // --- Traffic, pedestrians, police, convoy ---
  for (const car of state.cars) {
    if (car === p.car) continue;
    stepTrafficCar(state, car, dt);
  }
  for (const ped of state.peds) stepPed(state, ped, dt);
  if (wantedStars(state.wanted) > 0) spawnPolice(state);
  for (const cop of state.police) stepPolice(state, cop, dt, events);
  // Police give up once the heat is gone.
  if (wantedStars(state.wanted) === 0 && state.police.length > 0) {
    state.police.length = 0;
  }
  for (const car of state.convoy) stepConvoyCar(state, car, dt, events);
  events.push(...stepBullets(state, dt));

  // --- Pickups ---
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < (p.inCar ? 46 : 30)) {
      state.missions.cash += pk.amount;
      events.push({ type: 'cash', amount: pk.amount, sound: 'cash' });
      state.pickups.splice(i, 1);
    }
  }

  // --- Particles ---
  for (let i = state.particles.length - 1; i >= 0; i--) {
    state.particles[i].life -= dt;
    if (state.particles[i].life <= 0) state.particles.splice(i, 1);
  }

  // --- Wanted decay ---
  decayWanted(state.wanted, dt);

  // --- Mission triggers ---
  const step = missionObjective(state.missions);
  const m = state.missions;
  if (step.id === 'm1-pickup' && state.witness.waiting) {
    const w = state.witness;
    if (p.inCar && Math.hypot(w.x - p.x, w.y - p.y) < 110) {
      w.waiting = false;
      w.following = true;
      events.push({ type: 'mission', event: 'pickup-witness' });
    }
  }
  if (step.id === 'm1-deliver' && state.witness.following) {
    const g = landmark('garage');
    if (p.inCar && Math.hypot(g.x - p.x, g.y - p.y) < 150) {
      events.push({ type: 'mission', event: 'deliver-witness' });
      state.witness.following = false;
    }
  }
  if (step.id === 'm2-go-depot') {
    const d = landmark('depot');
    if (Math.hypot(d.x - p.x, d.y - p.y) < 170) {
      events.push({ type: 'mission', event: 'reach-depot' });
    }
  }
  if (step.id === 'm2-grab' && controls.interact) {
    const d = landmark('depot');
    if (Math.hypot(d.x - p.x, d.y - p.y) < 170) {
      state.deedsTaken = true;
      addHeat(state.wanted, 80);
      events.push({ type: 'mission', event: 'grab-deeds' });
      events.push({ type: 'sound', name: 'siren' });
    }
  }
  if (step.id === 'm2-escape' && wantedStars(state.wanted) === 0) {
    events.push({ type: 'mission', event: 'lose-cops' });
  }
  if (m.index === 2 && !state.convoySpawned) spawnConvoy(state);
  if (step.id === 'm3-intercept' && state.convoy.length > 0) {
    const lead = state.convoy[0];
    if (Math.hypot(lead.x - p.x, lead.y - p.y) < 420) {
      events.push({ type: 'mission', event: 'reach-convoy' });
    }
  }
  if (step.id === 'm3-stop' && state.convoy.length > 0 && state.convoy.every((c) => c.stopped)) {
    events.push({ type: 'mission', event: 'stop-convoy' });
  }

  // --- Health / wasted ---
  if (p.hp <= 0) events.push({ type: 'wasted' });

  // --- Camera follows the player ---
  const cam = state.camera;
  cam.x += (p.x - cam.x) * Math.min(1, dt * 5);
  cam.y += (p.y - cam.y) * Math.min(1, dt * 5);

  // --- Top up pedestrians that wandered off (keeps the streets busy) ---
  if (state.peds.length < TRAFFIC.pedestrians) {
    state.peds.push(randomPed(state.rng));
  }

  return events;
}

/** Apply a mission event to the story; returns the cash reward, if any. */
export function applyMissionEvent(state, event) {
  const reward = advanceMission(state.missions, event);
  if (reward > 0) {
    dropCash(state, state.player.x, state.player.y - 40, 0);
    state.pickups.pop();
  }
  return reward;
}

export { currentMission, missionObjective, wantedStars };
