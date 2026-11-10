export type TeamId = 'A' | 'B';

export interface Basket {
  id: string;
  videoId: string;
  timeSec: number; // moment of the shot within its Video
  team: TeamId;
  points: 1 | 2 | 3;
  playerNumber?: number;
}

/** End of a quarter or period, marked at one moment in a Video like a Basket. */
export interface PeriodEnd {
  id: string;
  videoId: string;
  timeSec: number;
  kind: 'quarter' | 'period';
}

/** Free text marked at one moment in a Video (shown in the Scoring log). */
export interface Note {
  id: string;
  videoId: string;
  timeSec: number;
  text: string;
}

export interface Game {
  title: string;
  teams: Record<TeamId, { name: string }>;
  players: { team: TeamId; number: number; name?: string }[];
  videos: { id: string; order: number; src: string; durationSec?: number }[];
  baskets: Basket[];
  periodEnds?: PeriodEnd[]; // optional: older game.json files have none
  notes?: Note[]; // optional, same reason
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

interface Positioned {
  score: Record<TeamId, number>; // running score at this point
  videoIndex: number; // 0-based position of its Video in Game order
  newVideo: boolean; // first entry of its Video
}
export type LogRow = Basket & Positioned & { type: 'basket' };
// label: "END OF Q2"; inKind: points scored since the previous end of the same kind.
export type EndRow = PeriodEnd & Positioned & { type: 'end'; label: string; inKind: Positioned['score'] };
export type NoteRow = Note & Positioned & { type: 'note' };
export type LogEntry = LogRow | EndRow | NoteRow;

// At the same moment: Basket, then note, then period end (a buzzer-beater counts before the end).
const RANK = { basket: 0, note: 1, end: 2 };

/** Every Basket, note and period end in Game order (video order, then timeSec), with the running score. */
export function gameLog(game: Game): LogEntry[] {
  const index = new Map(sortedVideos(game).map((v, i) => [v.id, i]));
  const idx = (x: { videoId: string }) => index.get(x.videoId) ?? Infinity;
  const items = [
    ...game.baskets.map((b) => ({ ...b, type: 'basket' as const })),
    ...(game.notes ?? []).map((n) => ({ ...n, type: 'note' as const })),
    ...(game.periodEnds ?? []).map((e) => ({ ...e, type: 'end' as const })),
  ].sort((a, b) => idx(a) - idx(b) || a.timeSec - b.timeSec || RANK[a.type] - RANK[b.type]);
  const score = { A: 0, B: 0 };
  const count = { quarter: 0, period: 0 };
  const prev = { quarter: { A: 0, B: 0 }, period: { A: 0, B: 0 } }; // score at the last end of each kind
  let lastVideo = -1;
  return items.map((x): LogEntry => {
    const videoIndex = idx(x);
    const pos = { videoIndex, newVideo: videoIndex !== lastVideo };
    lastVideo = videoIndex;
    if (x.type === 'basket') {
      score[x.team] += x.points;
      return { ...x, ...pos, score: { ...score } };
    }
    if (x.type === 'note') return { ...x, ...pos, score: { ...score } };
    const n = ++count[x.kind];
    const label = x.kind === 'quarter' ? `END OF Q${n}` : `END OF PERIOD ${n}`;
    const inKind = { A: score.A - prev[x.kind].A, B: score.B - prev[x.kind].B };
    prev[x.kind] = { ...score };
    return { ...x, ...pos, score: { ...score }, label, inKind };
  });
}

/** Just the Baskets of gameLog. */
export const scoringLog = (game: Game): LogRow[] =>
  gameLog(game).filter((e): e is LogRow => e.type === 'basket');

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
