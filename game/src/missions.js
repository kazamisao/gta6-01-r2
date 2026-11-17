// The story: three missions, each a short chain of steps. advanceMission
// takes a world event ('steal-car', 'pickup-witness', ...) and, only when it
// matches the current step, moves the story on and returns the step's reward
// in cash (0 when nothing was earned). Wrong events are ignored.
import { MISSIONS } from './config.js';

const STEP_EVENTS = {
  'm1-steal': 'steal-car',
  'm1-pickup': 'pickup-witness',
  'm1-deliver': 'deliver-witness',
  'm2-go-depot': 'reach-depot',
  'm2-grab': 'grab-deeds',
  'm2-escape': 'lose-cops',
  'm3-intercept': 'reach-convoy',
  'm3-stop': 'stop-convoy',
};

export function createMissions() {
  return { index: 0, step: 0, cash: 0, done: false, failed: false };
}

export function currentMission(m) {
  return MISSIONS[m.index] ?? null;
}

export function missionObjective(m) {
  const mission = currentMission(m);
  if (!mission) return { id: 'done', text: 'Solara Bay is yours, Nia. Venn is finished.', target: null };
  return mission.steps[m.step];
}

export function missionTitle(m) {
  const mission = currentMission(m);
  return mission ? `${mission.id.toUpperCase()} — ${mission.title}` : 'Free Roam';
}

export function missionBriefing(m) {
  const mission = currentMission(m);
  return mission ? mission.briefing : 'Venn is finished. The bay is yours — drive, explore, spend.';
}

export function advanceMission(m, event) {
  const step = missionObjective(m);
  if (step.id === 'done') return 0;
  if (STEP_EVENTS[step.id] !== event) return 0;
  const reward = step.reward ?? 0;
  m.cash += reward;
  m.step += 1;
  const mission = currentMission(m);
  if (m.step >= mission.steps.length) {
    m.index += 1;
    m.step = 0;
    if (m.index >= MISSIONS.length) m.done = true;
  }
  return reward;
}

/** Failing a mission step (busted/wasted mid-mission) restarts that mission. */
export function failMission(m) {
  if (m.done) return;
  m.step = 0;
  m.failed = true;
}
