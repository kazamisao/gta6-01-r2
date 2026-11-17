// Arcade car physics: accelerate, steer, brake, and slide along buildings.
// A car is a circle of radius 30 for collision — simple, stable, and good
// enough for a top-down chase.
import { CAR, CITY } from './config.js';
import { collideCircleBuildings } from './city.js';

const RADIUS = 30;

function topSpeed(car) {
  return CAR.maxSpeed * (car.tuned ? CAR.engineTuneBonus : 1);
}

/**
 * One fixed step. input: { throttle: -1..1, steer: -1..1, brake: bool }.
 * throttle 1 = gas, -1 = reverse; brake stops the car quickly.
 */
export function stepCar(car, input, dt, city) {
  const max = topSpeed(car);
  if (input.throttle > 0) car.speed += CAR.accel * input.throttle * dt;
  else if (input.throttle < 0) car.speed += CAR.accel * 0.6 * input.throttle * dt;
  if (input.brake) {
    const s = Math.sign(car.speed);
    car.speed -= s * CAR.brake * dt;
    if (Math.sign(car.speed) !== s) car.speed = 0;
  }
  // Drag plus rolling stop.
  car.speed -= car.speed * CAR.drag * dt;
  if (Math.abs(car.speed) < 2 && input.throttle === 0) car.speed = 0;
  car.speed = Math.max(-CAR.maxReverse, Math.min(max, car.speed));

  const grip = Math.min(1, Math.abs(car.speed) / 120);
  car.angle += input.steer * CAR.turnRate * grip * dt * (car.speed >= 0 ? 1 : -1);

  const dx = Math.cos(car.angle) * car.speed * dt;
  const dy = Math.sin(car.angle) * car.speed * dt;
  moveAxis(car, dx, 0, city);
  moveAxis(car, 0, dy, city);

  car.x = Math.max(40, Math.min(CITY.size - 40, car.x));
  car.y = Math.max(40, Math.min(CITY.size - 40, car.y));
  return car;
}

/** Move along one axis; if a building blocks the way, stay put and bleed speed. */
function moveAxis(car, dx, dy, city) {
  const nx = car.x + dx;
  const ny = car.y + dy;
  if (collideCircleBuildings(nx, ny, RADIUS, city)) {
    car.speed *= 0.35;
    return;
  }
  car.x = nx;
  car.y = ny;
}

/** Circle-vs-circle test for car/car and car/pedestrian bumps. */
export function circlesHit(a, ar, b, br) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}
