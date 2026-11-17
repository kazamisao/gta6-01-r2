// Drawing only: the world state and the camera in, pixels out. The canvas
// is the whole window; the camera follows the player, and only what is
// inside the view is painted (viewport culling keeps the frame cheap).
import { CITY, FONT, LANDMARKS, PALETTE, ROADS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_MAP = 'map';
export const SCREEN_WIN = 'win';

function text(ctx, value, x, y, size, color, align, baseline) {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = baseline || 'alphabetic';
  ctx.fillText(value, x, y);
}

function drawCar(ctx, x, y, angle, color, opts) {
  const o = opts || {};
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-42, -20 + 4, 84, 44);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-42, -22, 84, 44, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,24,40,0.85)';
  ctx.beginPath();
  ctx.roundRect(-14, -19, 26, 38, 6);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(38, -18, 5, 8);
  ctx.fillRect(38, 10, 5, 8);
  if (o.police) {
    const t = Math.floor(performance.now() / 180) % 2;
    ctx.fillStyle = t === 0 ? '#ff3b30' : '#3a6fd8';
    ctx.fillRect(-8, -24, 12, 5);
    ctx.fillStyle = t === 0 ? '#3a6fd8' : '#ff3b30';
    ctx.fillRect(4, -24, 12, 5);
  }
  if (o.smoke) {
    ctx.fillStyle = 'rgba(120,120,120,0.7)';
    ctx.beginPath();
    ctx.arc(-30, -10, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPed(ctx, x, y, angle, color, down) {
  ctx.save();
  ctx.translate(x, y);
  if (down > 0) {
    ctx.rotate(Math.PI / 2);
    ctx.globalAlpha = 0.8;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.arc(Math.cos(angle) * 4, Math.sin(angle) * 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }

  function drawWorld(state, opts) {
    const hideLabels = opts && opts.hideLabels;
    const cam = state.camera;
    const vw = canvas.width / (window.devicePixelRatio || 1);
    const vh = canvas.height / (window.devicePixelRatio || 1);
    const scale = Math.max(1, Math.min(1.15, vw / 1280));
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
    const viewW = vw / scale;
    const viewH = vh / scale;
    const ox = cam.x - viewW / 2;
    const oy = cam.y - viewH / 2;
    ctx.save();
    ctx.translate(-ox, -oy);

    const x0 = ox - 80;
    const y0 = oy - 80;
    const x1 = ox + viewW + 80;
    const y1 = oy + viewH + 80;

    // Ground.
    ctx.fillStyle = '#453d33';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Water and beach on the west edge, with wave lines and sand speckles.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(Math.max(x0, 0), y0, Math.min(CITY.waterWidth, x1) - Math.max(x0, 0), y1 - y0);
    ctx.strokeStyle = 'rgba(232,240,240,0.35)';
    ctx.lineWidth = 2;
    for (let wy = Math.max(0, Math.floor(y0 / 90) * 90); wy < Math.min(CITY.size, y1); wy += 90) {
      if (CITY.waterWidth < x0 || CITY.waterWidth > x1) continue;
      ctx.beginPath();
      ctx.moveTo(Math.max(x0, 8), wy);
      ctx.quadraticCurveTo(48, wy + 10, Math.min(x1, CITY.waterWidth - 8), wy);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(Math.max(x0, CITY.waterWidth), y0, Math.min(CITY.beachWidth, x1) - Math.max(x0, CITY.waterWidth), y1 - y0);
    ctx.fillStyle = 'rgba(120,90,40,0.5)';
    for (let sy = Math.max(0, Math.floor(y0 / 47) * 47); sy < Math.min(CITY.size, y1); sy += 47) {
      for (let sx = Math.max(CITY.waterWidth + 8, Math.floor(x0 / 53) * 53); sx < Math.min(CITY.beachWidth - 8, x1); sx += 53) {
        ctx.fillRect(sx + ((sy * 7) % 23), sy + ((sx * 3) % 17), 3, 3);
      }
    }
    // Marina pier: wooden planks reaching into the water at y=1800.
    if (1800 > y0 - 60 && 1800 < y1 + 60 && x0 < 150) {
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(Math.max(x0, 0), 1788, Math.min(150, x1) - Math.max(x0, 0), 24);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let px = Math.max(0, Math.floor(x0 / 18) * 18); px < Math.min(150, x1); px += 18) {
        ctx.fillRect(px, 1788, 2, 24);
      }
    }
    // Parks.
    ctx.fillStyle = PALETTE.park;
    for (const park of state.city.parks) {
      if (park.x > x1 || park.x + park.w < x0 || park.y > y1 || park.y + park.h < y0) continue;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const a of ROADS.avenues) {
      if (a < x0 - 40 || a > x1 + 40) continue;
      ctx.fillRect(a - CITY.roadWidth / 2, Math.max(y0, 0), CITY.roadWidth, Math.min(y1, CITY.size) - Math.max(y0, 0));
    }
    for (const s of ROADS.streets) {
      if (s < y0 - 40 || s > y1 + 40) continue;
      ctx.fillRect(Math.max(x0, 0), s - CITY.roadWidth / 2, Math.min(x1, CITY.size) - Math.max(x0, 0), CITY.roadWidth);
    }
    // Centre dashes.
    ctx.fillStyle = PALETTE.roadLine;
    for (const a of ROADS.avenues) {
      if (a < x0 - 40 || a > x1 + 40) continue;
      for (let y = Math.max(0, Math.floor(y0 / 60) * 60); y < Math.min(CITY.size, y1); y += 60) {
        ctx.fillRect(a - 2, y, 4, 28);
      }
    }
    for (const s of ROADS.streets) {
      if (s < y0 - 40 || s > y1 + 40) continue;
      for (let x = Math.max(0, Math.floor(x0 / 60) * 60); x < Math.min(CITY.size, x1); x += 60) {
        ctx.fillRect(x, s - 2, 28, 4);
      }
    }
    // Buildings: extruded pseudo-3D — south and east faces, then the roof.
    for (const b of state.city.buildings) {
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      const h = b.height;
      ctx.fillStyle = PALETTE.buildingSide;
      ctx.fillRect(b.x, b.y + b.h, b.w, h * 0.45);
      ctx.fillRect(b.x + b.w, b.y, h * 0.45, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 8);
      if (b.downtown) {
        ctx.fillStyle = 'rgba(255,214,120,0.85)';
        for (let wy = b.y + 18; wy < b.y + b.h - 10; wy += 22) {
          for (let wx = b.x + 12; wx < b.x + b.w - 10; wx += 20) {
            ctx.fillRect(wx, wy, 8, 10);
          }
        }
      }
    }
    // Landmark labels on the ground.
    for (const lm of LANDMARKS) {
      if (lm.x < x0 || lm.x > x1 || lm.y < y0 || lm.y > y1) continue;
      if (lm.kind === 'garage' || lm.kind === 'depot' || lm.kind === 'pier') {
        ctx.fillStyle = lm.kind === 'garage' ? '#3f7a44' : lm.kind === 'depot' ? '#7a5a3a' : '#8a6a4a';
        ctx.fillRect(lm.x - 70, lm.y - 50, 140, 100);
        if (!hideLabels) text(ctx, lm.name, lm.x, lm.y - 58, 15, PALETTE.text, 'center');
      }
      if (lm.kind === 'tower' || lm.kind === 'venn') {
        ctx.fillStyle = lm.kind === 'venn' ? '#23232e' : '#5a4a7a';
        ctx.fillRect(lm.x - 55, lm.y - 55, 110, 110);
        ctx.fillStyle = 'rgba(255,214,120,0.9)';
        for (let wy = lm.y - 40; wy < lm.y + 45; wy += 20) {
          for (let wx = lm.x - 40; wx < lm.x + 45; wx += 20) ctx.fillRect(wx, wy, 8, 10);
        }
        if (!hideLabels) text(ctx, lm.name, lm.x, lm.y - 63, 15, PALETTE.text, 'center');
      }
    }
    // Cash pickups.
    for (const pk of state.pickups) {
      if (pk.x < x0 || pk.x > x1 || pk.y < y0 || pk.y > y1) continue;
      ctx.fillStyle = '#58d68d';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 9, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '$', pk.x, pk.y + 5, 13, '#0e2a18', 'center');
    }
    // Witness Ana.
    const w = state.witness;
    if (w.waiting && w.x > x0 && w.x < x1 && w.y > y0 && w.y < y1) {
      ctx.strokeStyle = PALETTE.star;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w.x, w.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      drawPed(ctx, w.x, w.y, 0, '#ff7ab8', 0);
      text(ctx, 'ANA', w.x, w.y - 26, 13, '#ff7ab8', 'center');
    }
    // Pedestrians.
    for (const ped of state.peds) {
      if (ped.x < x0 || ped.x > x1 || ped.y < y0 || ped.y > y1) continue;
      drawPed(ctx, ped.x, ped.y, ped.angle, ped.color, ped.down);
    }
    // Traffic cars (the player's car is one of them; Ana rides along in it).
    for (const car of state.cars) {
      if (car.x < x0 || car.x > x1 || car.y < y0 || car.y > y1) continue;
      drawCar(ctx, car.x, car.y, car.angle, car.color, { smoke: car.hp < 40 });
      if (state.player.car === car && state.witness.following) {
        ctx.fillStyle = '#ff7ab8';
        ctx.beginPath();
        ctx.arc(car.x - Math.cos(car.angle) * 8, car.y - Math.sin(car.angle) * 8, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Convoy.
    for (const car of state.convoy) {
      if (car.x < x0 || car.x > x1 || car.y < y0 || car.y > y1) continue;
      drawCar(ctx, car.x, car.y, car.angle, '#1d1d24', { smoke: car.stopped || car.hp < 40 });
      text(ctx, 'VENN', car.x, car.y - 34, 12, '#ff5a4e', 'center');
    }
    // Police.
    for (const cop of state.police) {
      if (cop.onFoot) {
        if (cop.x < x0 || cop.x > x1 || cop.y < y0 || cop.y > y1) continue;
        drawPed(ctx, cop.x, cop.y, cop.angle, PALETTE.police, cop.down);
        text(ctx, 'POLICE', cop.x, cop.y - 24, 11, '#7aa8ff', 'center');
      } else {
        if (cop.x < x0 || cop.x > x1 || cop.y < y0 || cop.y > y1) continue;
        drawCar(ctx, cop.x, cop.y, cop.angle, '#e8e8f0', { police: true });
      }
    }
    // The player.
    const p = state.player;
    if (!p.inCar) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x + 2, p.y + 4, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.player;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2118';
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.angle) * 5, p.y + Math.sin(p.angle) * 5, 6, 0, Math.PI * 2);
      ctx.fill();
      if (p.punchAnim > 0) {
        ctx.strokeStyle = PALETTE.player;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 24, p.angle - 0.6, p.angle + 0.6);
        ctx.stroke();
      }
      text(ctx, 'NIA', p.x, p.y - 22, 12, PALETTE.player, 'center');
    }
    // Bullets.
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // Particles.
    for (const pt of state.particles) {
      const a = pt.life / pt.max;
      if (pt.kind === 'skid') {
        ctx.fillStyle = `rgba(20,16,20,${0.5 * a})`;
        ctx.fillRect(pt.x - 6, pt.y - 3, 12, 6);
      } else if (pt.kind === 'smoke') {
        ctx.fillStyle = `rgba(160,160,160,${0.45 * a})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 12 + (1 - a) * 14, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.kind === 'spark') {
        ctx.fillStyle = `rgba(255,220,90,${a})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.kind === 'muzzle') {
        ctx.fillStyle = `rgba(255,240,160,${a})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    // Sunset wash over everything.
    const grad = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.3, vw / 2, vh / 2, vh * 0.9);
    grad.addColorStop(0, 'rgba(255,154,92,0)');
    grad.addColorStop(1, 'rgba(255,154,92,0.16)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);
  }

  function drawPanel(title, lines, prompt) {
    const vw = canvas.width / (window.devicePixelRatio || 1);
    const vh = canvas.height / (window.devicePixelRatio || 1);
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const w = 640;
    const h = 150 + lines.length * 30 + 60;
    const x = (vw - w) / 2;
    const y = (vh - h) / 2;
    ctx.fillStyle = 'rgba(20,16,31,0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PALETTE.sunset;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    text(ctx, title, vw / 2, y + 58, 44, PALETTE.text, 'center');
    lines.forEach((line, i) => text(ctx, line, vw / 2, y + 108 + i * 30, 18, PALETTE.muted, 'center'));
    text(ctx, prompt, vw / 2, y + h - 30, 18, PALETTE.star, 'center');
  }

  function drawTitle(state, best, withMap) {
    drawWorld(state, { hideLabels: true });
    const vw = canvas.width / (window.devicePixelRatio || 1);
    const vh = canvas.height / (window.devicePixelRatio || 1);
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = 'rgba(20,16,31,0.55)';
    ctx.fillRect(0, 0, vw, vh);
    // With the map panel on the right, the title block moves left so nothing overlaps.
    const cx = withMap ? Math.max(330, vw / 2 - 240) : vw / 2;
    text(ctx, 'SOLARA BAY', cx, vh / 2 - 150, 72, PALETTE.text, 'center');
    text(ctx, 'An open-world story in a city that never sleeps', cx, vh / 2 - 100, 20, PALETTE.sunset, 'center');
    text(ctx, 'Nia Reyes, getaway driver. Marlo Venn wants the waterfront.', cx, vh / 2 - 66, 17, PALETTE.muted, 'center');
    text(ctx, 'Three missions. One city. Steal it back.', cx, vh / 2 - 38, 17, PALETTE.muted, 'center');
    text(ctx, 'WASD move  •  E steal / enter car  •  F punch  •  Click shoot  •  TAB map  •  P pause', cx, vh / 2 + 8, 15, PALETTE.text, 'center');
    text(ctx, 'Press Space or click to start', cx, vh / 2 + 52, 22, PALETTE.star, 'center');
    if (best > 0) text(ctx, `Best cash: $${best}`, cx, vh / 2 + 92, 16, PALETTE.muted, 'center');
    if (withMap) drawTitleMap(state, vw, vh);
  }

  /** The whole labelled city, framed on the title screen for the cover map shot. */
  function drawTitleMap(state, vw, vh) {
    const size = 400;
    const x = vw - size - 36;
    const y = 30;
    const scale = size / CITY.size;
    ctx.fillStyle = 'rgba(20,16,31,0.92)';
    ctx.fillRect(x - 10, y - 10, size + 20, size + 44);
    ctx.strokeStyle = PALETTE.sunset;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 10, y - 10, size + 20, size + 44);
    text(ctx, 'SOLARA BAY — CITY MAP', x + size / 2, y + size + 20, 15, PALETTE.text, 'center');
    ctx.fillStyle = '#2e2a33';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(x, y, CITY.waterWidth * scale, size);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x + CITY.waterWidth * scale, y, (CITY.beachWidth - CITY.waterWidth) * scale, size);
    ctx.fillStyle = PALETTE.road;
    for (const a of ROADS.avenues) ctx.fillRect(x + a * scale - 1, y, 2, size);
    for (const s of ROADS.streets) ctx.fillRect(x, y + s * scale - 1, size, 2);
    for (const d of state.city.districts) {
      // Skip a district name when a landmark label sits on top of it.
      const clash = LANDMARKS.some((lm) => Math.hypot(lm.x - (d.x + d.w / 2), lm.y - (d.y + d.h / 2)) < 190);
      if (clash) continue;
      const lx = Math.max(x + 46, Math.min(x + size - 46, x + (d.x + d.w / 2) * scale));
      text(ctx, d.name.toUpperCase(), lx, y + (d.y + d.h / 2) * scale, 10, 'rgba(245,239,224,0.8)', 'center', 'middle');
    }
    for (const lm of LANDMARKS) {
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(x + lm.x * scale, y + lm.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `9px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,16,31,0.9)';
      ctx.strokeText(lm.name, x + lm.x * scale + 5, y + lm.y * scale + 3);
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(lm.name, x + lm.x * scale + 5, y + lm.y * scale + 3);
    }
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(x + state.player.x * scale, y + state.player.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  resize();
  window.addEventListener('resize', resize);
  return { drawWorld, drawPanel, drawTitle, resize };
}

/** Convert a client (mouse) point to world coordinates under the camera. */
export function screenToWorld(state, clientX, clientY) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.max(1, Math.min(1.15, vw / 1280));
  const viewW = vw / scale;
  const viewH = vh / scale;
  return {
    x: state.camera.x - viewW / 2 + clientX / scale,
    y: state.camera.y - viewH / 2 + clientY / scale,
  };
}
