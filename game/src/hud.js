// HUD, minimap and the full-city map: everything drawn in screen space,
// on top of the world. The minimap is a 180 px live view of the city;
// the map (TAB) is the whole city with labelled districts and landmarks.
import { CITY, DISTRICTS, FONT, LANDMARKS, PALETTE, ROADS, SHOP } from './config.js';
import { missionObjective, missionTitle, wantedStars } from './entities.js';

const MAP_SIZE = 180;

function text(ctx, value, x, y, size, color, align, baseline) {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = baseline || 'alphabetic';
  ctx.fillText(value, x, y);
}

function drawStars(ctx, stars, x, y) {
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? PALETTE.star : 'rgba(245,239,224,0.25)';
    ctx.font = `26px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('★', x + i * 26, y);
  }
}

function drawMinimap(ctx, state, x, y, size) {
  const scale = size / CITY.size;
  ctx.save();
  ctx.fillStyle = 'rgba(20,16,31,0.88)';
  ctx.fillRect(x - 6, y - 6, size + 12, size + 12);
  ctx.strokeStyle = 'rgba(245,239,224,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 6, y - 6, size + 12, size + 12);
  // Water + sand + roads.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x, y, CITY.waterWidth * scale, size);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x + CITY.waterWidth * scale, y, (CITY.beachWidth - CITY.waterWidth) * scale, size);
  ctx.fillStyle = PALETTE.road;
  for (const a of ROADS.avenues) ctx.fillRect(x + a * scale - 1, y, 2, size);
  for (const s of ROADS.streets) ctx.fillRect(x, y + s * scale - 1, size, 2);
  // Mission target.
  const step = missionObjective(state.missions);
  if (step.target) {
    const lm = LANDMARKS.find((l) => l.id === step.target);
    if (lm) {
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(x + lm.x * scale, y + lm.y * scale, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Police (blue), player (yellow), convoy (red).
  ctx.fillStyle = PALETTE.police;
  for (const cop of state.police) ctx.fillRect(x + cop.x * scale - 2, y + cop.y * scale - 2, 4, 4);
  ctx.fillStyle = '#ff5a4e';
  for (const c of state.convoy) {
    if (!c.stopped) ctx.fillRect(x + c.x * scale - 2, y + c.y * scale - 2, 4, 4);
  }
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(x + state.player.x * scale, y + state.player.y * scale, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFullMap(ctx, state, vw, vh) {
  const size = Math.min(vw - 120, vh - 160);
  const x = (vw - size) / 2;
  const y = 90;
  const scale = size / CITY.size;
  ctx.fillStyle = 'rgba(20,16,31,0.94)';
  ctx.fillRect(0, 0, vw, vh);
  text(ctx, 'SOLARA BAY', vw / 2, 52, 34, PALETTE.text, 'center');
  // Ground, water, sand, roads.
  ctx.fillStyle = '#2e2a33';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x, y, CITY.waterWidth * scale, size);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x + CITY.waterWidth * scale, y, (CITY.beachWidth - CITY.waterWidth) * scale, size);
  ctx.fillStyle = PALETTE.park;
  for (const park of state.city.parks) ctx.fillRect(x + park.x * scale, y + park.y * scale, park.w * scale, park.h * scale);
  ctx.fillStyle = PALETTE.road;
  for (const a of ROADS.avenues) ctx.fillRect(x + a * scale - 1.5, y, 3, size);
  for (const s of ROADS.streets) ctx.fillRect(x, y + s * scale - 1.5, size, 3);
  // Districts.
  for (const d of DISTRICTS) {
    text(ctx, d.name.toUpperCase(), x + (d.x + d.w / 2) * scale, y + (d.y + d.h / 2) * scale, 13, 'rgba(245,239,224,0.75)', 'center', 'middle');
  }
  // Landmarks.
  for (const lm of LANDMARKS) {
    ctx.fillStyle = PALETTE.star;
    ctx.beginPath();
    ctx.arc(x + lm.x * scale, y + lm.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, lm.name, x + lm.x * scale + 8, y + lm.y * scale + 4, 12, PALETTE.text, 'left', 'middle');
  }
  // Player.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(x + state.player.x * scale, y + state.player.y * scale, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + state.player.x * scale, y + state.player.y * scale, 10, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, 'TAB / click to close  •  Nia is the yellow dot', vw / 2, y + size + 34, 15, PALETTE.muted, 'center');
}

export function drawHud(ctx, state, vw, vh) {
  const p = state.player;
  const stars = wantedStars(state.wanted);
  ctx.save();
  // Mission banner (a short toast after each story beat).
  if (state.banner && state.time < state.banner.until) {
    ctx.fillStyle = 'rgba(20,16,31,0.88)';
    const bw = 560;
    ctx.fillRect(vw / 2 - bw / 2, 100, bw, 46);
    ctx.strokeStyle = PALETTE.star;
    ctx.lineWidth = 1;
    ctx.strokeRect(vw / 2 - bw / 2, 100, bw, 46);
    text(ctx, state.banner.text, vw / 2, 130, 17, PALETTE.star, 'center', 'middle');
  }
  // Top-left: cash + mission.
  ctx.fillStyle = 'rgba(20,16,31,0.72)';
  ctx.fillRect(14, 12, 420, 64);
  text(ctx, `$${state.missions.cash}`, 28, 40, 26, '#7be495', 'left', 'top');
  text(ctx, missionTitle(state.missions), 28, 66, 14, PALETTE.text, 'left', 'top');
  const step = missionObjective(state.missions);
  text(ctx, step.text, 28, 84, 13, PALETTE.muted, 'left', 'top');
  // Top-right: wanted stars + health.
  ctx.fillStyle = 'rgba(20,16,31,0.72)';
  ctx.fillRect(vw - 234, 12, 220, 64);
  drawStars(ctx, stars, vw - 220, 20);
  text(ctx, stars > 0 ? 'WANTED' : 'CLEAN', vw - 220, 52, 13, stars > 0 ? PALETTE.danger : PALETTE.muted, 'left', 'top');
  ctx.fillStyle = 'rgba(245,239,224,0.25)';
  ctx.fillRect(vw - 220, 68, 190, 8);
  ctx.fillStyle = p.hp > 30 ? PALETTE.health : PALETTE.danger;
  ctx.fillRect(vw - 220, 68, 190 * Math.max(0, p.hp / p.maxHp), 8);
  // Bottom-right: minimap.
  drawMinimap(ctx, state, vw - MAP_SIZE - 20, vh - MAP_SIZE - 20, MAP_SIZE);
  // Bottom-left: speedometer while driving, controls hint on foot.
  if (p.inCar && p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.24);
    text(ctx, `${kmh}`, 28, vh - 66, 44, PALETTE.text, 'left', 'top');
    text(ctx, 'km/h  •  W/S drive  •  Space brake  •  E exit', 28, vh - 24, 13, PALETTE.muted, 'left', 'top');
    // Car condition bar.
    ctx.fillStyle = 'rgba(245,239,224,0.25)';
    ctx.fillRect(28, vh - 84, 150, 6);
    ctx.fillStyle = p.car.hp > 40 ? PALETTE.health : PALETTE.danger;
    ctx.fillRect(28, vh - 84, 150 * Math.max(0, p.car.hp / 100), 6);
  } else {
    text(ctx, 'WASD walk  •  Shift sprint  •  E steal car  •  F punch  •  Click shoot  •  TAB map', 28, vh - 24, 13, PALETTE.muted, 'left', 'top');
  }
  // Shop hint near the garage.
  if (state.shopOpen) {
    ctx.fillStyle = 'rgba(20,16,31,0.9)';
    ctx.fillRect(vw / 2 - 260, vh / 2 - 130, 520, 260);
    text(ctx, "ROSA'S GARAGE", vw / 2, vh / 2 - 100, 26, PALETTE.text, 'center', 'top');
    SHOP.forEach((item, i) => {
      text(ctx, `${i + 1}. ${item.name} — $${item.price}`, vw / 2, vh / 2 - 56 + i * 34, 17, PALETTE.text, 'center', 'top');
      text(ctx, item.text, vw / 2, vh / 2 - 34 + i * 34, 12, PALETTE.muted, 'center', 'top');
    });
    text(ctx, 'Press 1-3 to buy, E to leave', vw / 2, vh / 2 + 96, 14, PALETTE.star, 'center', 'top');
    if (state.shopMsg) text(ctx, state.shopMsg, vw / 2, vh / 2 + 118, 13, '#7be495', 'center', 'top');
  }
  ctx.restore();
}

export function drawMapScreen(ctx, state, vw, vh) {
  drawFullMap(ctx, state, vw, vh);
}
