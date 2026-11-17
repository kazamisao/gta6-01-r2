// Solara Bay — tests first (TDD). Pure-logic modules only; no DOM at import time.
// Run: node --test tests/test.js  (from the repo root)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mulberry32, hashSeed } from '../game/src/random.js';
import { CITY, ROADS, DISTRICTS, LANDMARKS, PALETTE } from '../game/src/config.js';
import { buildCity, isOnRoad, nearestRoadPoint, buildingAt, collideCircleBuildings } from '../game/src/city.js';
import { stepCar } from '../game/src/physics.js';
import { createWanted, addHeat, decayWanted, wantedStars } from '../game/src/wanted.js';
import { createMissions, missionObjective, advanceMission } from '../game/src/missions.js';
import { saveState, loadState } from '../game/src/save.js';

test('rng is deterministic for the same seed', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
  assert.notEqual(mulberry32(42)(), mulberry32(43)());
  assert.equal(hashSeed('solara'), hashSeed('solara'));
});

test('city fits inside the world and roads form a grid', () => {
  assert.equal(CITY.size, 3600);
  assert.ok(ROADS.avenues.length >= 8);
  assert.ok(ROADS.avenues.every((x) => x > 0 && x < CITY.size));
  const city = buildCity(7);
  assert.ok(city.buildings.length > 80, 'many buildings');
  assert.ok(city.buildings.every((b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= CITY.size && b.y + b.h <= CITY.size));
  // No building sits on a road.
  for (const b of city.buildings) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    assert.equal(isOnRoad(cx, cy), false, `building centre on road at ${cx},${cy}`);
  }
});

test('landmarks and districts are placed on the map', () => {
  assert.ok(LANDMARKS.length >= 6);
  const city = buildCity(7);
  for (const lm of LANDMARKS) {
    const p = city.landmarkPos[lm.id];
    assert.ok(p, `landmark ${lm.id} placed`);
    assert.ok(p.x >= 0 && p.x < CITY.size && p.y >= 0 && p.y < CITY.size);
  }
  assert.ok(DISTRICTS.length >= 5);
  const road = nearestRoadPoint(100, 100);
  assert.ok(isOnRoad(road.x, road.y));
});

test('car physics: building collision stops the car', () => {
  const city = buildCity(7);
  const b = city.buildings[0];
  // Drive straight at the building's centre from the west, on its mid-height.
  const car = { x: b.x - 120, y: b.y + b.h / 2, angle: 0, speed: 300, width: 46, length: 84 };
  for (let i = 0; i < 240; i++) {
    stepCar(car, { throttle: 1, steer: 0, brake: false }, 1 / 60, city);
  }
  // The car approached the wall (its nose is at the building face) but never
  // passed through it, and the impact bled its speed away.
  assert.ok(car.x + 30 >= b.x - 6, 'car reached the building face');
  assert.ok(car.x < b.x + b.w / 2, 'car did not pass through the building');
  assert.ok(car.speed < 60, 'impact bled the speed away');
});

test('car on open road keeps moving and steering turns it', () => {
  const city = buildCity(7);
  // South down the open beach strip: no buildings anywhere near it, so the
  // test proves the steering and acceleration themselves, not the navigation.
  const car = { x: 170, y: 400, angle: Math.PI / 2, speed: 0, width: 46, length: 84 };
  // Forty steps is short enough to stay on the beach.
  for (let i = 0; i < 40; i++) stepCar(car, { throttle: 1, steer: 0.5, brake: false }, 1 / 60, city);
  assert.ok(car.speed > 50, 'car accelerated');
  assert.ok(car.angle > Math.PI / 2 + 0.2, 'steering turned the car');
  assert.ok(car.y > 450, 'car travelled down the beach');
});

test('wanted: crime raises stars, decay lowers them', () => {
  const w = createWanted();
  assert.equal(wantedStars(w), 0);
  addHeat(w, 40); // steal a car
  assert.equal(wantedStars(w), 1);
  addHeat(w, 120); // shootout
  assert.ok(wantedStars(w) >= 3);
  decayWanted(w, 120); // two quiet minutes
  assert.ok(wantedStars(w) < 3, 'heat decays when quiet');
  addHeat(w, 500);
  assert.equal(wantedStars(w), 5, 'stars cap at 5');
});

test('missions: Borrowed Wheels advances step by step and pays', () => {
  const m = createMissions();
  assert.equal(missionObjective(m).id, 'm1-steal');
  advanceMission(m, 'steal-car');
  assert.equal(missionObjective(m).id, 'm1-pickup');
  advanceMission(m, 'pickup-witness');
  assert.equal(missionObjective(m).id, 'm1-deliver');
  const reward = advanceMission(m, 'deliver-witness');
  assert.equal(reward, 400);
  assert.equal(m.cash, 400);
  assert.equal(missionObjective(m).id, 'm2-go-depot');
});

test('missions: wrong event does not advance the mission', () => {
  const m = createMissions();
  advanceMission(m, 'deliver-witness');
  assert.equal(missionObjective(m).id, 'm1-steal');
  assert.equal(m.cash, 0);
});

test('save: state round-trips through serialisation', () => {
  const state = { cash: 1250, mission: 2, missionStep: 1, wanted: 2, hp: 80, x: 1234, y: 567, upgrades: { armor: true, engine: false } };
  const json = saveState(state);
  const back = loadState(json);
  assert.deepEqual(back, state);
  assert.equal(loadState('not json'), null);
  assert.equal(loadState(''), null);
});

test('palette is a sunset palette with distinct entries', () => {
  const keys = Object.keys(PALETTE);
  assert.ok(keys.length >= 10);
  assert.ok(new Set(Object.values(PALETTE)).size === keys.length, 'no duplicated colours');
});
