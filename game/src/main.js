// Solara Bay — boot and the one loop. Input is read every frame, the city
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, paused, map, busted/wasted, win.
//
// ?seed=N fixes the city. ?shot=chase|foot|drive|start (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { AUTOSAVE_SECONDS, LANDMARKS, PLAYER, SAVE_KEY, SHOP } from './config.js';
import { createGame, stepGame } from './entities.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_MAP, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, createInput } from './input.js';
import { createRenderer, SCREEN_MAP, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, screenToWorld } from './render.js';
import { drawHud, drawMapScreen } from './hud.js';
import { missionObjective } from './entities.js';
import { missionTitle } from './missions.js';
import { failMission, advanceMission } from './missions.js';
import { addHeat, clearWanted, wantedStars } from './wanted.js';
import { loadState, saveState } from './save.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

function vw() { return window.innerWidth; }
function vh() { return window.innerHeight; }

function resetTransform() {
  const ratio = window.devicePixelRatio || 1;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function runShot(name) {
  const staged = stageShot(name, seed);
  const state = staged.state;
  let painted = 0;
  function paint() {
    if (staged.screen === SCREEN_TITLE) {
      renderer.drawTitle(state, 0, staged.withMap);
    } else {
      renderer.drawWorld(state);
      resetTransform();
      drawHud(ctx, state, vw(), vh());
    }
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const state = createGame(seed);
  state.upgrades = { armor: false, engine: false };
  let screen = SCREEN_TITLE;
  let best = 0;
  let overKind = 'BUSTED';
  let accumulator = 0;
  let last = performance.now();
  let prevMouseDown = false;
  let saveTimer = 0;

  try { best = Number.parseInt(window.localStorage.getItem('solara-bay.best') ?? '0', 10) || 0; } catch { best = 0; }

  // Restore a previous visit's progress, if there is one.
  try {
    const saved = loadState(window.localStorage.getItem(SAVE_KEY));
    if (saved) {
      state.missions.cash = saved.cash ?? 0;
      state.missions.index = saved.missionIndex ?? 0;
      state.missions.step = saved.missionStep ?? 0;
      state.player.hp = saved.hp ?? PLAYER.maxHp;
      state.player.maxHp = saved.maxHp ?? PLAYER.maxHp;
      state.player.x = saved.x ?? state.player.x;
      state.player.y = saved.y ?? state.player.y;
      state.camera.x = state.player.x;
      state.camera.y = state.player.y;
      state.upgrades = saved.upgrades ?? { armor: false, engine: false };
      state.deedsTaken = saved.deedsTaken ?? false;
      // Ana's state travels with the save: without it, a reload during
      // the delivery step left her waiting at the market while the
      // delivery trigger needs her following, and mission 1 could never
      // finish.
      if (saved.witnessWaiting !== undefined) state.witness.waiting = saved.witnessWaiting;
      if (saved.witnessFollowing !== undefined) state.witness.following = saved.witnessFollowing;
      if (missionObjective(state.missions).id === 'm1-deliver') {
        // Step m1-deliver is only reachable after Ana was picked up, so
        // an older save without witness fields still resumes correctly.
        state.witness.waiting = false;
        state.witness.following = true;
      }
      if (state.missions.index >= 3) state.missions.done = true;
    }
  } catch { /* A broken save just starts fresh. */ }

  function announce(message) {
    status.textContent = message;
  }

  function saveNow() {
    try {
      window.localStorage.setItem(SAVE_KEY, saveState({
        cash: state.missions.cash,
        missionIndex: state.missions.index,
        missionStep: state.missions.step,
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        x: state.player.x,
        y: state.player.y,
        upgrades: state.upgrades,
        deedsTaken: state.deedsTaken,
        witnessWaiting: state.witness.waiting,
        witnessFollowing: state.witness.following,
        time: state.time,
      }));
      window.localStorage.setItem('solara-bay.best', String(Math.max(best, state.missions.cash)));
    } catch { /* Storage can be off: the run then lasts this visit only. */ }
  }

  function banner(text) {
    state.banner = { text, until: state.time + 4 };
  }

  function garage() {
    return LANDMARKS.find((l) => l.id === 'garage');
  }

  function nearGarage() {
    const g = garage();
    return Math.hypot(g.x - state.player.x, g.y - state.player.y) < 170;
  }

  function nearCar() {
    for (const car of state.cars) {
      if (car.police || car.convoy) continue;
      if (Math.hypot(car.x - state.player.x, car.y - state.player.y) < 80) return true;
    }
    return false;
  }

  function startGame() {
    audio.unlock();
    screen = SCREEN_PLAY;
    announce('Playing. Steal a car and reach the market.');
  }

  function endRun(kind) {
    overKind = kind;
    screen = SCREEN_OVER;
    const fine = kind === 'BUSTED' ? 100 : 150;
    state.missions.cash = Math.max(0, state.missions.cash - fine);
    failMission(state.missions);
    clearWanted(state.wanted);
    state.police.length = 0;
    state.player.hp = state.player.maxHp;
    state.player.inCar = false;
    if (state.player.car) { state.player.car.hp = 100; state.player.car = null; }
    const g = garage();
    state.player.x = g.x + 120;
    state.player.y = g.y + 60;
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    audio.busted();
    saveNow();
    announce(`${kind}. You lost $${fine}. Back at Rosa's Garage.`);
  }

  function handleEvents(events) {
    for (const ev of events) {
      if (ev.sound === 'shot') audio.shot();
      else if (ev.sound === 'punch') audio.punch();
      else if (ev.sound === 'pickup') audio.pickup();
      else if (ev.sound === 'cash') audio.cash();
      else if (ev.sound === 'siren') audio.siren();
      else if (ev.sound === 'crash') audio.crash();
      if (ev.type === 'heat') addHeat(state.wanted, ev.amount);
      if (ev.type === 'cash') banner(`+$${ev.amount} cash`);
      if (ev.type === 'car-wrecked') banner('Your car is wrecked! Run!');
      if (ev.type === 'convoy-stopped') {
        const left = state.convoy.filter((c) => !c.stopped).length;
        banner(left > 0 ? `Convoy car stopped! ${left} to go.` : 'Convoy stopped!');
      }
      if (ev.type === 'busted') endRun('BUSTED');
      if (ev.type === 'wasted') endRun('WASTED');
    }
    // Mission events change the story; apply them in order.
    for (const ev of events) {
      if (ev.type !== 'mission') continue;
      const reward = advanceMission(state.missions, ev.event);
      audio.mission();
      if (reward > 0) banner(`Mission complete! +$${reward}`);
      else banner(`${missionTitle(state.missions)} — ${missionObjective(state.missions).text}`);
      if (state.missions.done) {
        screen = SCREEN_WIN;
        best = Math.max(best, state.missions.cash);
        saveNow();
        announce('You did it. Venn is finished and Solara Bay is yours.');
      }
    }
  }

  // One-shot actions, read once per frame and spent by handleActions/step.
  // handleActions consumes the menu keys and leaves INTERACT/PUNCH for step().
  let pendingActions = 0;

  function handleActions() {
    const actions = pendingActions;
    pendingActions = 0;
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      banner(muted ? 'Sound off (M to turn back on)' : 'Sound on');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) {
        if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
          // Fresh start after an ending.
          state.missions.index = 0;
          state.missions.step = 0;
          state.missions.done = false;
        }
        startGame();
      }
      return;
    }
    if (screen === SCREEN_MAP) {
      if (actions & (ACTION_MAP | ACTION_CONFIRM | ACTION_PAUSE)) screen = SCREEN_PLAY;
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) screen = SCREEN_PLAY;
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_MAP) {
      screen = SCREEN_MAP;
      return;
    }
    if (state.shopOpen) {
      if (actions & ACTION_INTERACT) {
        state.shopOpen = false;
        state.shopMsg = '';
      }
      return;
    }
    if ((actions & ACTION_INTERACT) && !state.player.inCar && nearGarage() && !nearCar()) {
      state.shopOpen = true;
      state.shopMsg = '';
      return;
    }
    // Anything left (INTERACT to steal/grab, PUNCH) stays pending for step().
    pendingActions = actions & (ACTION_INTERACT | ACTION_PUNCH);
  }

  function buyShop(index) {
    const item = SHOP[index];
    if (!item) return;
    if (state.missions.cash < item.price) {
      state.shopMsg = 'Not enough cash.';
      return;
    }
    state.missions.cash -= item.price;
    if (item.id === 'repair' && state.player.car) state.player.car.hp = 100;
    if (item.id === 'armor') {
      state.player.maxHp = 150;
      state.player.hp = 150;
      state.upgrades.armor = true;
    }
    if (item.id === 'engine') state.upgrades.engine = true;
    state.shopMsg = `${item.name} — ${item.text}`;
    audio.cash();
    saveNow();
  }

  window.addEventListener('keydown', (event) => {
    if (!state.shopOpen) return;
    if (event.code === 'Digit1') buyShop(0);
    else if (event.code === 'Digit2') buyShop(1);
    else if (event.code === 'Digit3') buyShop(2);
  });

  function step() {
    const move = input.move();
    const mouse = input.mouse();
    let shootAngle = null;
    if (screen === SCREEN_PLAY && !state.player.inCar && mouse.down) {
      const world = screenToWorld(state, mouse.x, mouse.y);
      shootAngle = Math.atan2(world.y - state.player.y, world.x - state.player.x);
    }
    const controls = {
      move,
      sprint: input.sprint(),
      throttle: (move.y < 0 ? 1 : 0) + (move.y > 0 ? -0.6 : 0),
      steer: move.x,
      brake: input.brake(),
      interact: false,
      punch: false,
      shootAngle,
    };
    // One-shot actions are consumed here, once per step batch.
    const actions = pendingActions;
    pendingActions = 0;
    if (actions & ACTION_INTERACT) controls.interact = true;
    if (actions & ACTION_PUNCH) controls.punch = true;
    if (state.shopOpen) {
      controls.interact = false;
      controls.punch = false;
    }
    const events = stepGame(state, controls, STEP);
    if (state.player.car) state.player.car.tuned = state.upgrades.engine;
    handleEvents(events);
    saveTimer += STEP;
    if (saveTimer >= AUTOSAVE_SECONDS) {
      saveTimer = 0;
      saveNow();
    }
    audio.engine(state.player.inCar && state.player.car ? true : false, state.player.car ? state.player.car.speed : 0);
    prevMouseDown = mouse.down;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    pendingActions |= input.takeActions();
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    draw();
  }

  function draw() {
    const w = vw();
    const h = vh();
    if (screen === SCREEN_TITLE) {
      renderer.drawTitle(state, best, false);
      return;
    }
    if (screen === SCREEN_MAP) {
      renderer.drawWorld(state);
      resetTransform();
      drawMapScreen(ctx, state, w, h);
      return;
    }
    renderer.drawWorld(state);
    resetTransform();
    drawHud(ctx, state, w, h);
    if (screen === SCREEN_PAUSED) {
      renderer.drawPanel('Paused', ['The city waits for you.', `Cash $${state.missions.cash}  •  ${missionTitle(state.missions)}`], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      const lines = overKind === 'BUSTED'
        ? ['The Solara Bay police caught Nia.', 'You lost some cash. The mission restarts.', `Cash now $${state.missions.cash}`]
        : ['Nia is down. The bay keeps moving.', 'You lost some cash. The mission restarts.', `Cash now $${state.missions.cash}`];
      renderer.drawPanel(overKind, lines, 'Press Space to get back up');
    } else if (screen === SCREEN_WIN) {
      renderer.drawPanel('HIGH TIDE', ['The convoy is stopped. Venn is finished.', 'Solara Bay belongs to its people again.', `Final cash $${state.missions.cash}`], 'Press Space to keep playing');
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solara Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
