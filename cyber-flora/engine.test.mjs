import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GardenEngine, ABSORPTION_MS, LOCK_MS } from './engine.mjs';

test('continuous dwell locks at exactly 3 seconds and releases at exactly 7 seconds', () => {
  const garden = new GardenEngine();
  garden.enter(0, 100);
  garden.tick(3099);
  assert.equal(garden.lockedIndex, null);
  assert.equal(garden.nodes[0].state, 'absorbing');
  garden.tick(3100);
  assert.equal(garden.lockedIndex, 0);
  assert.equal(garden.nodes[0].state, 'overload');
  assert.equal(garden.remaining(3100), LOCK_MS);
  garden.tick(7099);
  assert.equal(garden.remaining(7099), 1);
  garden.tick(7100);
  assert.equal(garden.lockedIndex, null);
  assert.equal(garden.activeIndex, null);
  assert.equal(garden.nodes[0].state, 'released');
  assert.equal(garden.nodes[0].energy, 0);
});

test('70% load survives an immediate return and needs only the remaining 900ms', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  garden.leave(0, 2100);
  assert.equal(garden.nodes[0].energy, 0.7);
  garden.enter(0, 2100);
  assert.equal(garden.nodes[0].energy, 0.7);
  garden.tick(2999);
  assert.equal(garden.lockedIndex, null);
  garden.tick(3000);
  assert.equal(garden.lockedIndex, 0);
  assert.equal(garden.lockedAt, 3000);
  garden.tick(6999);
  assert.equal(garden.nodes[0].energy, 1);
  garden.tick(7000);
  assert.equal(garden.nodes[0].energy, 0);
});

test('70% cools to 60% during 600ms away and resumes from 60%', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  garden.leave(0, 2100);
  garden.tick(2700);
  assert.ok(Math.abs(garden.nodes[0].energy - 0.6) < 1e-10);
  garden.enter(0, 2700);
  assert.ok(Math.abs(garden.nodes[0].energy - 0.6) < 1e-10);
  garden.tick(3300);
  assert.ok(Math.abs(garden.nodes[0].energy - 0.8) < 1e-10);
  garden.tick(3900);
  assert.equal(garden.lockedIndex, 0);
  assert.equal(garden.lockedAt, 3900);
});

test('each module cools independently and repeated visits retain residual energy', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  garden.enter(1, 2100);
  garden.enter(0, 2700);
  assert.ok(Math.abs(garden.nodes[0].energy - 0.6) < 1e-10);
  assert.ok(Math.abs(garden.nodes[1].energy - 0.2) < 1e-10);
  garden.leave(0, 3000);
  assert.ok(Math.abs(garden.nodes[0].energy - 0.7) < 1e-10);
  garden.enter(0, 3300);
  assert.ok(Math.abs(garden.nodes[0].energy - 0.65) < 1e-10);
  assert.ok(Math.abs(garden.nodes[1].energy - 0.1) < 1e-10);
  garden.leave(0, 3300);
  garden.tick(100000);
  assert.equal(garden.nodes[0].energy, 0);
  assert.equal(garden.nodes[1].energy, 0);
});

test('a delayed tick observes the earlier overload deadline of a warm module', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  garden.leave(0, 2100);
  garden.enter(0, 2700);
  garden.tick(7000);
  assert.equal(garden.lockedAt, 3900);
  assert.equal(garden.remaining(7000), 900);
  garden.tick(7900);
  assert.equal(garden.nodes[0].state, 'released');
  assert.equal(garden.nodes[0].energy, 0);
});

test('exact-threshold leave cannot evade the trap', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  assert.equal(garden.leave(0, ABSORPTION_MS), false);
  assert.equal(garden.lockedIndex, 0);
});

test('movement and repeated enter events cannot redirect or restart a trap', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  assert.equal(garden.enter(0, 1000), false);
  garden.tick(3000);
  assert.equal(garden.enter(1, 4000), false);
  assert.equal(garden.leave(0, 5000), false);
  assert.equal(garden.activeIndex, 0);
  assert.equal(garden.lockedAt, 3000);
  assert.equal(garden.stats.feeds, 1);
  assert.equal(garden.stats.overloads, 1);
});

test('release requires leaving before the same node can absorb again', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  garden.tick(7000);
  assert.equal(garden.enter(0, 7100), false);
  garden.leave(0, 7200);
  assert.equal(garden.enter(0, 7300), true);
  assert.equal(garden.nodes[0].state, 'absorbing');
});

test('delayed animation frames preserve elapsed timing, rather than extending lock', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  garden.tick(6500);
  assert.equal(garden.lockedAt, 3000);
  assert.equal(garden.remaining(6500), 500);
  garden.tick(20000);
  assert.equal(garden.lockedIndex, null);
  assert.equal(garden.nodes[0].state, 'released');
  assert.equal(garden.stats.overloads, 1);
  const skipped = new GardenEngine();
  skipped.enter(0, 0);
  skipped.tick(20000);
  assert.equal(skipped.lockedIndex, null);
  assert.equal(skipped.stats.overloads, 1);
});

test('infinite mode stays absorbing with full energy however long the dwell', () => {
  const garden = new GardenEngine();
  garden.setMode('infinite', 0);
  garden.enter(1, 0);
  garden.tick(3600000);
  assert.equal(garden.lockedIndex, null);
  assert.equal(garden.nodes[1].state, 'absorbing');
  assert.equal(garden.nodes[1].energy, 1);
  assert.equal(garden.dwell(3600000), 3600000);
  assert.equal(garden.stats.overloads, 0);
});

test('changing mode clears active trap and session stats; reset preserves selected mode', () => {
  const garden = new GardenEngine();
  garden.enter(2, 0);
  garden.tick(3000);
  garden.setMode('infinite', 3500);
  assert.equal(garden.lockedIndex, null);
  assert.equal(garden.activeIndex, null);
  assert.deepEqual(garden.stats, { feeds: 0, overloads: 0, bestDwell: 0 });
  garden.enter(1, 4000);
  garden.reset(5000);
  assert.equal(garden.mode, 'infinite');
  assert.ok(garden.nodes.every(node => node.state === 'idle' && node.energy === 0));
});

test('Escape releases early without resetting overload stats', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  garden.tick(3000);
  assert.equal(garden.release(3500), 0);
  assert.equal(garden.lockedIndex, null);
  assert.equal(garden.nodes[0].state, 'released');
  assert.equal(garden.stats.overloads, 1);
  assert.equal(garden.enter(0, 3600), false);
});

test('entering another node leaves the old node and starts a new continuous duration', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  garden.enter(1, 2000);
  garden.tick(3000);
  assert.equal(garden.activeIndex, 1);
  assert.equal(garden.nodes[0].state, 'idle');
  assert.equal(garden.nodes[1].state, 'absorbing');
  assert.equal(garden.dwell(3000), 1000);
});

test('entering at the release boundary starts the next node with a fresh clock', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  garden.tick(3000);
  assert.equal(garden.enter(1, 7000), true);
  assert.equal(garden.nodes[0].state, 'released');
  assert.equal(garden.activeIndex, 1);
  assert.equal(garden.activeSince, 7000);
  assert.equal(garden.dwell(7000), 0);
  garden.tick(9999);
  assert.equal(garden.lockedIndex, null);
  garden.tick(10000);
  assert.equal(garden.lockedIndex, 1);
  assert.equal(garden.stats.overloads, 2);
});

test('an enter after both deadlines have passed records old trap and starts only new dwell', () => {
  const garden = new GardenEngine();
  garden.enter(0, 0);
  assert.equal(garden.enter(1, 15000), true);
  assert.equal(garden.stats.overloads, 1);
  assert.equal(garden.nodes[0].state, 'released');
  assert.equal(garden.nodes[1].energy, 0);
  assert.equal(garden.dwell(15000), 0);
});
