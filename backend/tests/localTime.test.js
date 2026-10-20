'use strict';
const { localParts } = require('../src/utils/localTime');
const { evaluateCode } = require('../src/utils/billing');

const game = { _id: 'g1', name: 'PS5' };
const code = { active: true, code: 'HAPPY', type: 'percent', value: 10, timeFrom: '14:00', timeTo: '17:00', games: [], durations: [], maxUses: 0, used: 0 };

test('dates are read in Pakistan time, not the server clock', () => {
  // 21:30 UTC on Friday = 02:30 Saturday in Karachi (UTC+5)
  expect(localParts(new Date('2026-10-23T21:30:00Z'))).toEqual({ ymd: '2026-10-24', hm: '02:30', day: 6 });
});

test('a 14:00-17:00 discount code works at 3 PM Pakistan time', () => {
  const now = new Date('2026-10-19T10:00:00Z'); // 15:00 in Karachi
  expect(evaluateCode(code, { game, minutes: 60, baseAfterGameDiscount: 500, now })).toEqual({ ok: true, amountOff: 50 });
});

test('a 14:00-17:00 discount code is refused at 11 AM Pakistan time', () => {
  const now = new Date('2026-10-19T06:00:00Z'); // 11:00 in Karachi
  expect(evaluateCode(code, { game, minutes: 60, baseAfterGameDiscount: 500, now }).ok).toBe(false);
});
