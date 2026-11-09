import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDayCarousel,
  formatSlotTime,
  sortBranchesPrincipalFirst,
  toDateKey,
} from '../publicBooking.js';

describe('formatSlotTime', () => {
  it('shows the slot in 12-hour format', () => {
    assert.equal(formatSlotTime('08:00'), '8:00 a. m.');
    assert.equal(formatSlotTime('12:30'), '12:30 p. m.');
    assert.equal(formatSlotTime('13:00'), '1:00 p. m.');
    assert.equal(formatSlotTime('00:15'), '12:15 a. m.');
  });
});

describe('toDateKey', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    assert.equal(toDateKey(new Date(2026, 8, 26)), '2026-09-26');
  });
});

describe('buildDayCarousel', () => {
  it('returns N consecutive days starting from today (local)', () => {
    const from = new Date(2026, 8, 26); // 26 Sep 2026 local
    const days = buildDayCarousel(from, 14);
    assert.equal(days.length, 14);
    assert.equal(days[0].dateKey, '2026-09-26');
    assert.equal(days[1].dateKey, '2026-09-27');
    assert.equal(days[13].dateKey, '2026-10-09');
    assert.equal(days[0].weekdayShort, 'sáb');
    assert.equal(days[0].dayNumber, 26);
    assert.equal(days[0].isToday, true);
    assert.equal(days[1].isToday, false);
  });

  it('defaults to 14 days when count omitted', () => {
    const days = buildDayCarousel(new Date(2026, 0, 1));
    assert.equal(days.length, 14);
  });
});

describe('sortBranchesPrincipalFirst', () => {
  it('puts is_main branch first without mutating input', () => {
    const input = [
      { id: 'a', name: 'Norte', is_main: false },
      { id: 'b', name: 'Principal', is_main: true },
      { id: 'c', name: 'Sur', is_main: false },
    ];
    const sorted = sortBranchesPrincipalFirst(input);
    assert.equal(sorted[0].id, 'b');
    assert.equal(sorted[1].id, 'a');
    assert.equal(input[0].id, 'a');
  });

  it('keeps original order when no principal', () => {
    const input = [
      { id: 'a', name: 'Norte' },
      { id: 'c', name: 'Sur' },
    ];
    const sorted = sortBranchesPrincipalFirst(input);
    assert.deepEqual(sorted.map((b) => b.id), ['a', 'c']);
  });
});
