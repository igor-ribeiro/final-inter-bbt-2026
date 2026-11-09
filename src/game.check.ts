// Run: node --experimental-strip-types src/game.check.ts
import assert from 'node:assert/strict';
import { ensurePlayer, scoringLog, type Game } from './game.ts';

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

const g2 = ensurePlayer(ensurePlayer(game, 'A', 7), 'A', 7);
assert.equal(g2.players.length, 1);
assert.equal(ensurePlayer(g2, 'B', 7).players.length, 2);
console.log('ok');
