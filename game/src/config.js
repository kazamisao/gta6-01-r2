// Solara Bay — every tuning number, colour and named place in one place.
// The world is a fixed 3600x3600 city; the renderer only ever paints the
// camera's view, so no rule below depends on the screen size.

export const CITY = { size: 3600, roadSpacing: 300, roadWidth: 72, beachWidth: 240, waterWidth: 96 };

// Avenues run north-south, streets east-west, both every 300 px.
export const ROADS = {
  avenues: [300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300],
  streets: [300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300],
};

export const DISTRICTS = [
  { id: 'old-town', name: 'Old Town', x: 300, y: 300, w: 900, h: 600 },
  { id: 'north-hills', name: 'North Hills', x: 1500, y: 300, w: 1200, h: 600 },
  { id: 'marina', name: 'Marina', x: 0, y: 1200, w: 600, h: 900 },
  { id: 'downtown', name: 'Downtown', x: 1500, y: 1200, w: 1200, h: 900 },
  { id: 'bay-boulevard', name: 'Bay Boulevard', x: 600, y: 1800, w: 2700, h: 300 },
  { id: 'harbor', name: 'Harbor', x: 2700, y: 2400, w: 900, h: 900 },
  { id: 'southside', name: 'Southside', x: 600, y: 2400, w: 1800, h: 900 },
];

// Named places the missions and the map use. x/y are world coordinates.
export const LANDMARKS = [
  { id: 'garage', name: "Rosa's Garage", x: 900, y: 900, kind: 'garage' },
  { id: 'depot', name: 'Harbor Depot', x: 3030, y: 3030, kind: 'depot' },
  { id: 'tower', name: 'Solara Tower', x: 1800, y: 1500, kind: 'tower' },
  { id: 'pier', name: 'Marina Pier', x: 150, y: 1800, kind: 'pier' },
  { id: 'beach', name: 'Sunset Beach', x: 150, y: 1200, kind: 'beach' },
  { id: 'venn', name: 'Venn Tower', x: 2700, y: 1800, kind: 'venn' },
  { id: 'plaza', name: 'Founders Plaza', x: 1800, y: 2100, kind: 'plaza' },
  { id: 'market', name: 'Old Town Market', x: 600, y: 600, kind: 'market' },
];

export const PLAYER = {
  radius: 13,
  walkSpeed: 170,
  sprintSpeed: 265,
  maxHp: 100,
  punchDamage: 12,
  punchRange: 34,
  punchCooldown: 0.38,
};

export const CAR = {
  width: 44,
  length: 82,
  accel: 420,
  brake: 700,
  maxSpeed: 520,
  maxReverse: 160,
  turnRate: 2.6,
  drag: 0.55,
  engineTuneBonus: 1.25,
};

export const TRAFFIC = { cars: 22, pedestrians: 70, policeCars: 4 };

export const WANTED = {
  maxStars: 5,
  stealCarHeat: 40,
  assaultHeat: 25,
  killHeat: 60,
  copKillHeat: 90,
  decayPerSecond: 1.1,
  starThreshold: 40, // heat per star
};

export const MISSIONS = [
  {
    id: 'm1',
    title: 'Borrowed Wheels',
    briefing: "Venn's men took the witness. Steal a car, pick up Ana at the market, and get her to Rosa's Garage.",
    steps: [
      { id: 'm1-steal', text: 'Steal a car (walk up to one and press E)', target: null },
      { id: 'm1-pickup', text: 'Pick up Ana at Old Town Market', target: 'market' },
      { id: 'm1-deliver', text: 'Drive Ana to Rosa\'s Garage', target: 'garage', reward: 400 },
    ],
  },
  {
    id: 'm2',
    title: 'Night Shift',
    briefing: 'The fake deeds are in Harbor Depot. Grab them and lose the cops.',
    steps: [
      { id: 'm2-go-depot', text: 'Reach Harbor Depot', target: 'depot' },
      { id: 'm2-grab', text: 'Grab the deeds (press E at the depot)', target: 'depot' },
      { id: 'm2-escape', text: 'Escape the police — drop to 0 stars', target: null, reward: 700 },
    ],
  },
  {
    id: 'm3',
    title: 'High Tide',
    briefing: "Venn's convoy rolls down Bay Boulevard at dusk. Stop all three cars.",
    steps: [
      { id: 'm3-intercept', text: 'Intercept the convoy on Bay Boulevard', target: 'venn' },
      { id: 'm3-stop', text: 'Stop the convoy cars (ram or shoot them out)', target: 'venn', reward: 1200 },
    ],
  },
];

export const SHOP = [
  { id: 'repair', name: 'Full repair', price: 150, text: 'Car restored to full condition' },
  { id: 'armor', name: 'Body armor', price: 300, text: '+50 max health, fully healed' },
  { id: 'engine', name: 'Engine tune', price: 500, text: '+25% top speed, forever' },
];

export const SAVE_KEY = 'solara-bay.save.v1';
export const AUTOSAVE_SECONDS = 20;

export const PALETTE = {
  sky: '#2b1e4e',
  sunset: '#ff9a5c',
  horizon: '#ffb37a',
  water: '#1d6f8e',
  sand: '#e8c98a',
  grass: '#4d7a4a',
  road: '#33313d',
  roadLine: '#e8d27a',
  sidewalk: '#5a5566',
  buildingRoof: '#7a5a8e',
  buildingRoof2: '#8e6a5a',
  buildingRoof3: '#5a7a8e',
  buildingSide: '#4a3a5e',
  park: '#3f7a44',
  player: '#ffd23e',
  police: '#3a6fd8',
  traffic: '#c94b4b',
  ped: '#e8e0d0',
  hud: '#14101f',
  text: '#f5efe0',
  muted: '#b8a898',
  star: '#ffe14d',
  health: '#58d68d',
  danger: '#ff5a4e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
