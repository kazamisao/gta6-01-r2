// The screenshot scenes behind ?shot=chase|foot|drive|start. Each one stages
// a real game state — a fresh city plus hand-placed actors — so the frame is
// what the game itself renders, and the same seed always gives the same frame.
import { addHeat } from './wanted.js';
import { createGame } from './entities.js';
import { SCREEN_MAP, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function givePlayerCar(state, x, y, angle, speed) {
  const car = state.cars[0];
  car.parked = false;
  car.color = '#ffd23e'; // Nia's yellow getaway car — unmistakable in every shot.
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = speed;
  car.hp = 100;
  state.player.inCar = true;
  state.player.car = car;
  state.player.x = x;
  state.player.y = y;
  state.player.angle = angle;
  state.camera.x = x;
  state.camera.y = y;
  return car;
}

function placeConvoy(state) {
  state.convoy = [];
  for (let i = 0; i < 3; i++) {
    state.convoy.push({
      x: 1830 + i * 130, y: 1800, angle: 0, speed: 150,
      hp: 100, color: '#1d1d24', police: false, convoy: true,
      stopped: false, tuned: false, avenue: false, line: 1800, dir: 1, cruise: 150,
    });
  }
  state.convoySpawned = true;
}

function placePolice(state, spots) {
  state.police = spots.map(([x, y]) => ({
    x, y, angle: 0, speed: 320, hp: 100,
    onFoot: false, down: 0, arrestTimer: 0, carHp: 120,
  }));
}

/**
 * Shots never step the game, so the runtime car collision cannot fix a
 * staged overlap: slide any traffic car that sits too close to a staged
 * actor along its own road until it is clear (wrapping along the road so
 * it stays in the world). Two 30-radius cars need 60 px to stop touching;
 * CLEAR_PX keeps them visibly apart with margin.
 */
const CLEAR_PX = 140;

function clearStagedActors(state, actors) {
  for (const car of state.cars) {
    if (car === state.player.car) continue;
    let tries = 0;
    while (tries < 12 && actors.some(([ax, ay]) => Math.hypot(car.x - ax, car.y - ay) < CLEAR_PX)) {
      if (car.avenue) {
        car.y += 160 * (car.dir || 1);
        if (car.y > 3300) car.y -= 3000;
        if (car.y < 300) car.y += 3000;
      } else {
        car.x += 160 * (car.dir || 1);
        if (car.x > 3300) car.x -= 3000;
        if (car.x < 300) car.x += 3000;
      }
      tries += 1;
    }
  }
}

/**
 * Stage `name` on a fresh game and return { state, screen, withMap }.
 * Unknown names stage the title screen.
 */
export function stageShot(name, seed) {
  const state = createGame(seed);
  if (name === 'chase') {
    state.missions.index = 2;
    state.missions.step = 1;
    placeConvoy(state);
    givePlayerCar(state, 1560, 1800, 0, 380);
    placePolice(state, [[1380, 1740], [1470, 1860]]);
    // Keep random traffic out of the staged cars: with seed 7 a traffic
    // car spawned on the player's bumper and the two cars visibly clipped.
    clearStagedActors(state, [
      [1560, 1800],
      [1380, 1740], [1470, 1860],
      [1830, 1800], [1960, 1800], [2090, 1800],
    ]);
    addHeat(state.wanted, 125); // 3 stars
    state.banner = { text: 'MISSION: HIGH TIDE — Stop the Venn convoy!', until: 9999 };
    return { state, screen: SCREEN_PLAY, withMap: false };
  }
  if (name === 'foot') {
    state.missions.index = 0;
    state.missions.step = 0;
    const p = state.player;
    p.x = 470;
    p.y = 1330;
    p.angle = Math.PI / 2;
    state.camera.x = 430;
    state.camera.y = 1330;
    // A car to steal, parked by the pier road, with the beach behind it.
    const car = state.cars[1];
    car.parked = true;
    car.color = '#4b7ac9';
    car.x = 540;
    car.y = 1330;
    car.angle = Math.PI / 2;
    // Pedestrians strolling the beach front.
    state.peds.slice(0, 10).forEach((ped, i) => {
      ped.x = 300 + (i % 5) * 55;
      ped.y = 1180 + Math.floor(i / 5) * 90;
      ped.down = 0;
    });
    state.banner = { text: 'MISSION: BORROWED WHEELS — Steal a car', until: 9999 };
    return { state, screen: SCREEN_PLAY, withMap: false };
  }
  if (name === 'drive') {
    state.missions.index = 0;
    state.missions.step = 2;
    state.witness.waiting = false;
    state.witness.following = true;
    givePlayerCar(state, 1500, 1800, 0, 430);
    state.banner = { text: "MISSION: BORROWED WHEELS — Drive Ana to Rosa's Garage", until: 9999 };
    return { state, screen: SCREEN_PLAY, withMap: false };
  }
  // start: title screen over downtown, with the labelled city map.
  state.camera.x = 1800;
  state.camera.y = 1500;
  return { state, screen: SCREEN_TITLE, withMap: true };
}

export { SCREEN_MAP };
