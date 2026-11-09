export type TeamId = 'A' | 'B';

export interface Basket {
  id: string;
  videoId: string;
  timeSec: number; // moment of the shot within its Video
  team: TeamId;
  points: 1 | 2 | 3;
  playerNumber?: number;
}

export interface Game {
  title: string;
  teams: Record<TeamId, { name: string }>;
  players: { team: TeamId; number: number; name?: string }[];
  videos: { id: string; order: number; src: string; durationSec?: number }[];
  baskets: Basket[];
}

// The one place team colors live (tailwind.config.ts imports these too).
export const TEAM_COLORS: Record<TeamId, string> = { A: '#5EA2FF', B: '#FF6B5E' };

export const LEAD_IN_SEC = 5;

export const fetchGame = (): Promise<Game> =>
  fetch('game.json', { cache: 'no-cache' }).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
  );

export const shortName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

export const clock = (t: number) =>
  `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export const sortedVideos = (game: Game) => [...game.videos].sort((a, b) => a.order - b.order);

/** "#7 João", "#12", or "" when the Basket has no Player. */
export function playerLabel(game: Game, b: Basket) {
  if (b.playerNumber === undefined) return '';
  const p = game.players.find((p) => p.team === b.team && p.number === b.playerNumber);
  return `#${b.playerNumber}${p?.name ? ` ${p.name}` : ''}`;
}

export interface LogRow extends Basket {
  score: Record<TeamId, number>; // running score after this Basket
  videoIndex: number; // 0-based position of its Video in Game order
  newVideo: boolean; // first Basket of its Video
}

/** Every Basket in Game order (video order, then timeSec) with the running score. */
export function scoringLog(game: Game): LogRow[] {
  const index = new Map(sortedVideos(game).map((v, i) => [v.id, i]));
  const idx = (b: Basket) => index.get(b.videoId) ?? Infinity;
  const score = { A: 0, B: 0 };
  let lastVideo = -1;
  return [...game.baskets]
    .sort((a, b) => idx(a) - idx(b) || a.timeSec - b.timeSec)
    .map((b) => {
      score[b.team] += b.points;
      const videoIndex = idx(b);
      const newVideo = videoIndex !== lastVideo;
      lastVideo = videoIndex;
      return { ...b, score: { ...score }, videoIndex, newVideo };
    });
}

export interface BoxRow {
  number: number | null; // null = Baskets with no Player
  points: number;
  timeline: number[]; // Basket values in game order
}

/** One Team's box score from Baskets already in game order (e.g. scoringLog). */
export function boxScore(gameOrder: Basket[], team: TeamId): BoxRow[] {
  const by = new Map<number | null, BoxRow>();
  for (const b of gameOrder) {
    if (b.team !== team) continue;
    const key = b.playerNumber ?? null;
    const row = by.get(key) ?? { number: key, points: 0, timeline: [] };
    row.points += b.points;
    row.timeline.push(b.points);
    by.set(key, row);
  }
  // Points desc, then number asc; "No player" last.
  return [...by.values()].sort(
    (x, y) =>
      Number(x.number === null) - Number(y.number === null) ||
      y.points - x.points ||
      (x.number ?? 0) - (y.number ?? 0),
  );
}

/** Adds the Player for this Team + number if it doesn't exist yet. */
export function ensurePlayer(game: Game, team: TeamId, number: number): Game {
  if (game.players.some((p) => p.team === team && p.number === number)) return game;
  return { ...game, players: [...game.players, { team, number }] };
}
