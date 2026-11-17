# Solara Bay — an open-world story

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/kazamisao/gta6-01-r2/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/kazamisao/gta6-01-r2/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the fictional coastal city of **Solara Bay**,
built for the [make.fun GTA 6 bounty](https://make.fun/bounty/gta6-01).
Referral code: `p5dwa49p`.

## The story

Nia Reyes is a getaway driver. Developer Marlo Venn wants the waterfront —
and he will forge, threaten and bulldoze whatever stands in his way. Three
story missions take Nia across the city:

1. **Borrowed Wheels** — steal a car, pick up the witness Ana at Old Town
   Market, and get her to Rosa's Garage.
2. **Night Shift** — steal the fake deeds from Harbor Depot and lose the cops.
3. **High Tide** — stop Venn's convoy on Bay Boulevard.

## What is in the game

- A 3600×3600 city to explore on foot and by car: Old Town, North Hills,
  Marina, Downtown, Bay Boulevard, Harbor and Southside, with Sunset Beach
  and the Marina Pier on the west edge.
- Traffic (±22 cars) and pedestrians (±70) with their own routines; cars
  can be stolen and driven with arcade physics and building collisions.
- A wanted level (0–5 stars) with police who chase, ram and arrest — get
  caught on foot and you are BUSTED, run out of health and you are WASTED.
- Combat on foot (punch, shoot), cash drops, and a shop at Rosa's Garage:
  repairs, body armor and an engine tune bought with mission cash.
- HUD with cash, mission objective, wanted stars, health and a speedometer,
  a live minimap, and a full labelled city map (TAB — also on the title
  screen). Start screen, pause, autosave every 20 seconds, and synthesised
  WebAudio sound and music. No network requests, no libraries.

## Controls

| Key | Action |
| --- | ------ |
| WASD / arrows | Walk (on foot) / drive (in a car) |
| Shift | Sprint |
| E | Steal / enter a car, exit a car, interact |
| F | Punch |
| Mouse click | Shoot toward the cursor |
| Space | Brake (in a car) |
| TAB | Full city map |
| P / Esc | Pause |
| M | Mute |
| 1–3 | Buy at Rosa's Garage (near the garage, press E) |

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Everything is static
files under `game/` — no build step, no network.

## Layout

- `game/src/config.js` — tuning, places, missions, palette
- `game/src/city.js` — the road grid, blocks, buildings, landmarks
- `game/src/random.js` — seeded randomness
- `game/src/physics.js` — arcade car physics and collisions
- `game/src/entities.js` — the living city: player, traffic, pedestrians, police, convoy
- `game/src/combat.js` — punching, shooting, cash drops
- `game/src/wanted.js` — heat and the 0–5 star wanted level
- `game/src/missions.js` — the three-mission story
- `game/src/save.js` — autosave serialisation
- `game/src/audio.js` — synthesised WebAudio sound and music
- `game/src/input.js` — keyboard and pointer input
- `game/src/hud.js` — HUD, minimap and full city map
- `game/src/render.js` — drawing the world, screens and title
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=…`)
- `game/src/main.js` — boot, loop, screens, shop and save
- `main.ts` — hands the entry in: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own
code in a browser (`?shot=chase|foot|drive|start&seed=7`): the convoy chase
with three wanted stars, stealing a car on foot by the beach, driving Ana to
the garage, and the title screen with the labelled city map.

## License

MIT — see `LICENSE`.
