// The wanted system: heat (0-200) maps to 0-5 stars. Crime adds heat,
// quiet time bleeds it away, and the police response scales with the stars.
import { WANTED } from './config.js';

export function createWanted() {
  return { heat: 0, quietFor: 0 };
}

export function wantedStars(w) {
  return Math.min(WANTED.maxStars, Math.floor(w.heat / WANTED.starThreshold));
}

export function addHeat(w, amount) {
  w.heat = Math.min(WANTED.maxStars * WANTED.starThreshold, w.heat + amount);
  w.quietFor = 0;
}

/** Call every step with dt; heat decays only while the player stays quiet. */
export function decayWanted(w, dt) {
  w.quietFor += dt;
  if (w.quietFor > 3) {
    w.heat = Math.max(0, w.heat - WANTED.decayPerSecond * dt);
  }
}

export function clearWanted(w) {
  w.heat = 0;
  w.quietFor = 0;
}
