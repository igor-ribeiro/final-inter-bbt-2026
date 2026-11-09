// Run: node --experimental-strip-types src/game.check.ts
import assert from 'node:assert/strict';
import { boxScore, ensurePlayer, gameLog, scoringLog, type Game } from './game.ts';

const game: Game = {
  title: 't',
  teams: { A: { name: 'Home' }, B: { name: 'Away' } },
  players: [],
  // 'v2' is listed first but plays second: order wins, not array position.
  videos: [
    { id: 'v2', order: 2, src: 'b.mp4' },
    { id: 'v1', order: 1, src: 'a.mp4' },
  ],
  baskets: [
    { id: '1', videoId: 'v2', timeSec: 1, team: 'B', points: 3 },
    { id: '2', videoId: 'v1', timeSec: 9, team: 'A', points: 2 },
    { id: '3', videoId: 'v1', timeSec: 2, team: 'A', points: 1 },
  ],
};

const log = scoringLog(game);
assert.deepEqual(log.map((r) => r.id), ['3', '2', '1']);
assert.deepEqual(log.map((r) => [r.score.A, r.score.B]), [[1, 0], [3, 0], [3, 3]]);
assert.deepEqual(log.map((r) => r.newVideo), [true, false, true]);
assert.deepEqual(scoringLog({ ...game, baskets: [] }), []);

// Box score: columns add up to the final score, timelines follow game order.
const box: Game = {
  ...game,
  baskets: [
    { id: 'a', videoId: 'v1', timeSec: 1, team: 'A', points: 2, playerNumber: 7 },
    { id: 'b', videoId: 'v1', timeSec: 2, team: 'A', points: 3 },
    { id: 'c', videoId: 'v2', timeSec: 0, team: 'A', points: 1, playerNumber: 7 },
    { id: 'd', videoId: 'v1', timeSec: 3, team: 'A', points: 3, playerNumber: 4 },
    { id: 'e', videoId: 'v1', timeSec: 4, team: 'B', points: 2, playerNumber: 9 },
  ],
};
const boxLog = scoringLog(box);
const boxA = boxScore(boxLog, 'A');
assert.deepEqual(boxA, [
  { number: 4, points: 3, timeline: [3] }, // 3 pts ties #7, lower number first
  { number: 7, points: 3, timeline: [2, 1] },
  { number: null, points: 3, timeline: [3] }, // "No player" last
]);
for (const t of ['A', 'B'] as const)
  assert.equal(
    boxScore(boxLog, t).reduce((n, r) => n + r.points, 0),
    boxLog.at(-1)!.score[t],
  );
assert.ok(boxScore(boxLog, 'B').every((r) => r.number !== null)); // no "No player" when not needed

// Period ends: interleaved in game order, numbered per kind, carry the running score.
const withEnds = gameLog({
  ...game,
  periodEnds: [
    { id: 'p1', videoId: 'v2', timeSec: 5, kind: 'period' },
    { id: 'q1', videoId: 'v1', timeSec: 9, kind: 'quarter' }, // same moment as Basket '2': after it
    { id: 'q2', videoId: 'v2', timeSec: 5, kind: 'quarter' },
  ],
});
assert.deepEqual(
  withEnds.map((e) => (e.type === 'end' ? `${e.label} ${e.score.A}-${e.score.B}` : e.id)),
  ['3', '2', 'END OF Q1 3-0', '1', 'END OF PERIOD 1 3-3', 'END OF Q2 3-3'],
);
assert.deepEqual(withEnds.map((e) => e.newVideo), [true, false, false, true, false, false]);
assert.deepEqual(scoringLog(game).map((r) => r.id), ['3', '2', '1']); // still Baskets only

// Notes: in game order; at the same moment after the Basket and before the period end.
const withNotes = gameLog({
  ...game,
  periodEnds: [{ id: 'q1', videoId: 'v1', timeSec: 9, kind: 'quarter' }],
  notes: [{ id: 'n1', videoId: 'v1', timeSec: 9, text: 'timeout' }],
});
assert.deepEqual(withNotes.map((e) => e.id), ['3', '2', 'n1', 'q1', '1']);

const g2 = ensurePlayer(ensurePlayer(game, 'A', 7), 'A', 7);
assert.equal(g2.players.length, 1);
assert.equal(ensurePlayer(g2, 'B', 7).players.length, 2);
console.log('ok');
