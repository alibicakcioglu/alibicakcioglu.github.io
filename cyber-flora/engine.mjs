export const ABSORPTION_MS = 3000;
export const LOCK_MS = 4000;
export const FADE_MS = 6000;

/** Timestamp-driven garden mechanics, independent of pointer and DOM events. */
export class GardenEngine {
  constructor(count = 7) {
    if (!Number.isInteger(count) || count < 1) throw new RangeError('A garden needs at least one node.');
    this.count = count;
    this.mode = 'trap';
    this._clock = 0;
    this.reset(0);
  }

  _time(now) {
    if (!Number.isFinite(now)) throw new TypeError('Provide a finite timestamp in milliseconds.');
    this._clock = Math.max(this._clock, now);
    return this._clock;
  }

  _valid(index) {
    return Number.isInteger(index) && index >= 0 && index < this.count;
  }

  reset(now = 0) {
    const time = this._time(now);
    this.nodes = Array.from({ length: this.count }, () => ({ state: 'idle', energy: 0 }));
    this._fades = this.nodes.map(() => ({ since: time, energy: 0 }));
    this.activeIndex = null;
    this.activeSince = null;
    this._entryEnergy = 0;
    this.lockedIndex = null;
    this.lockedAt = null;
    this._blockedIndex = null;
    this.stats = { feeds: 0, overloads: 0, bestDwell: 0 };
  }

  setMode(mode, now) {
    if (mode !== 'trap' && mode !== 'infinite') throw new RangeError('Unknown garden mode.');
    if (mode === this.mode) return false;
    this.mode = mode;
    this.reset(now);
    return true;
  }

  enter(index, now) {
    this.tick(now);
    const time = this._clock;
    if (!this._valid(index) || this.lockedIndex !== null || index === this.activeIndex) return false;
    if (index === this._blockedIndex) return false;
    if (this.activeIndex !== null) this.leave(this.activeIndex, time);
    this._blockedIndex = null;
    this.activeIndex = index;
    this.activeSince = time;
    this._entryEnergy = this.nodes[index].energy;
    this.nodes[index].state = 'absorbing';
    this.stats.feeds += 1;
    return true;
  }

  leave(index, now) {
    this.tick(now);
    const time = this._clock;
    if (!this._valid(index) || this.lockedIndex !== null) return false;
    if (index === this._blockedIndex) this._blockedIndex = null;
    if (index !== this.activeIndex) return false;
    const node = this.nodes[index];
    this._fades[index] = { since: time, energy: node.energy };
    node.state = 'idle';
    this.activeIndex = null;
    this.activeSince = null;
    return true;
  }

  tick(now) {
    const time = this._time(now);
    for (let index = 0; index < this.count; index += 1) {
      if (this.nodes[index].state !== 'idle') continue;
      const fade = this._fades[index];
      this.nodes[index].energy = Math.max(0, fade.energy - (time - fade.since) / FADE_MS);
    }

    if (this.activeIndex !== null && this.lockedIndex === null) {
      const elapsed = time - this.activeSince;
      const node = this.nodes[this.activeIndex];
      node.energy = Math.min(1, this._entryEnergy + elapsed / ABSORPTION_MS);
      const overloadAt = this.activeSince + (1 - this._entryEnergy) * ABSORPTION_MS;
      this.stats.bestDwell = Math.max(this.stats.bestDwell, this.mode === 'trap' ? Math.min(elapsed, ABSORPTION_MS) : elapsed);
      if (this.mode === 'trap' && time >= overloadAt) {
        this.lockedIndex = this.activeIndex;
        this.lockedAt = overloadAt;
        node.state = 'overload';
        node.energy = 1;
        this.stats.overloads += 1;
      }
    }

    if (this.lockedIndex !== null && time - this.lockedAt >= LOCK_MS) this._release();
    return this;
  }

  _release() {
    const index = this.lockedIndex;
    if (index === null) return null;
    this.nodes[index].state = 'released';
    this.nodes[index].energy = 0;
    this._blockedIndex = index;
    this.lockedIndex = null;
    this.lockedAt = null;
    this.activeIndex = null;
    this.activeSince = null;
    return index;
  }

  /** Escape hatch for keyboard accessibility; ordinary release still takes 4s. */
  release(now) {
    this.tick(now);
    return this._release();
  }

  dwell(now) {
    if (this.activeIndex === null) return 0;
    const elapsed = Math.max(0, Math.max(this._clock, now) - this.activeSince);
    return this.lockedIndex === null ? elapsed : ABSORPTION_MS;
  }

  remaining(now) {
    if (this.lockedIndex === null) return 0;
    return Math.max(0, LOCK_MS - (Math.max(this._clock, now) - this.lockedAt));
  }

  snapshot(now) {
    this.tick(now);
    return {
      mode: this.mode,
      nodes: this.nodes.map(node => ({ ...node })),
      activeIndex: this.activeIndex,
      lockedIndex: this.lockedIndex,
      dwell: this.dwell(now),
      remaining: this.remaining(now),
      stats: { ...this.stats },
    };
  }
}
