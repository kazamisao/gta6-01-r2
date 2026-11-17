// The screenshot scenes behind ?shot=chase|foot|drive|start. Each one stages
// a real game state — a fresh city plus hand-placed actors — so the frame is
// what the game itself renders, and the same seed always gives the same frame.
import { addHeat } from './wanted.js';
import { createGame } from './entities.js';
import { SCREEN_MAP, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function givePlayerCar(state, x, y, angle, speed) {
  const car = state.cars[0];
  car.parked = false;
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
      x: 1950 + i * 130, y: 1800, angle: 0, speed: 150,
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
    addHeat(state.wanted, 125); // 3 stars
    state.banner = { text: 'MISSION: HIGH TIDE — Stop the Venn convoy!', until: 9999 };
    return { state, screen: SCREEN_PLAY, withMap: false };
  }
  if (name === 'foot') {
    state.missions.index = 0;
    state.missions.step = 0;
    const p = state.player;
    p.x = 330;
    p.y = 1240;
    p.angle = Math.PI / 2;
    state.camera.x = 330;
    state.camera.y = 1240;
    // A car to steal, parked by the pier road.
    const car = state.cars[1];
    car.parked = true;
    car.x = 420;
    car.y = 1330;
    car.angle = Math.PI / 2;
    // Pedestrians strolling the beach front.
    state.peds.slice(0, 8).forEach((ped, i) => {
      ped.x = 300 + i * 40;
      ped.y = 1150 + (i % 3) * 60;
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
