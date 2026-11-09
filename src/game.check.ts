// Run: node --experimental-strip-types src/game.check.ts
import assert from 'node:assert/strict';
import { scoringLog, withPlayer, type Game } from './game.ts';

const game: Game = {
  teams: [{ name: 'Home' }, { name: 'Away' }],
  players: [],
  baskets: [
    { video: 'b.mp4', time: 1, team: 1, points: 3 },
    { video: 'a.mp4', time: 9, team: 0, points: 2 },
    { video: 'a.mp4', time: 2, team: 0, points: 1 },
  ],
};

assert.deepEqual(
  scoringLog(game).map((b) => b.score),
  [[1, 0], [3, 0], [3, 3]],
);
const g2 = withPlayer(withPlayer(game, 0, 7), 0, 7);
assert.equal(g2.players.length, 1);
assert.equal(withPlayer(g2, 1, 7).players.length, 2);
console.log('ok');
