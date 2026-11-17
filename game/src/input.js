// Keyboard and pointer input. Held keys steer; one-shot presses (interact,
// pause, map, mute, shoot) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost or counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_MAP = 8;
export const ACTION_MUTE = 16;
export const ACTION_SHOOT = 32;
export const ACTION_PUNCH = 64;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const INTERACT = new Set(['KeyE']);
const MAP = new Set(['Tab']);
const MUTE = new Set(['KeyM']);
const PUNCH = new Set(['KeyF']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  window.addEventListener('keydown', (event) => {
    if (MAP.has(event.code)) event.preventDefault();
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
    } else if (CONFIRM.has(event.code)) {
      // Space doubles as the brake, so track it in `held` as well as
      // queueing the one-shot confirm; keyup already removes it. Enter
      // stays confirm-only — it has no held-key job.
      if (event.code === 'Space') held.add('Space');
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_INTERACT;
    } else if (MAP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MAP;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (PUNCH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PUNCH;
    } else {
      return;
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouseDown = false;
  });
  target.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointermove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });
  target.addEventListener('pointerup', () => { mouseDown = false; });
  target.addEventListener('contextmenu', (event) => event.preventDefault());

  function has(set) {
    for (const code of set) if (held.has(code)) return true;
    return false;
  }

  return {
    /** Steering: { x: -1..1, y: -1..1 } in screen space. */
    move() {
      return {
        x: (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0),
        y: (has(DOWN) ? 1 : 0) - (has(UP) ? 1 : 0),
      };
    },
    sprint() { return held.has('ShiftLeft') || held.has('ShiftRight'); },
    // Space only. S / ArrowDown is reverse (throttle -1..0), not a brake:
    // folding reverse into brake() used to cancel the reverse thrust the
    // moment the car slowed through zero, pinning it at speed 0.
    brake() { return held.has('Space'); },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
