export type TeamIndex = 0 | 1;
export type Team = { name: string };
export type Player = { team: TeamIndex; number: number; name?: string };
export type Basket = {
  video: string;
  time: number;
  team: TeamIndex;
  points: 1 | 2 | 3;
  number?: number;
};
export type Game = { teams: [Team, Team]; players: Player[]; baskets: Basket[] };

export const videoUrl = (video: string) =>
  `${import.meta.env.BASE_URL}videos/${encodeURIComponent(video)}`;

export const compareVideos = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

export function playerLabel(game: Game, b: Basket) {
  if (b.number === undefined) return '';
  const p = game.players.find((p) => p.team === b.team && p.number === b.number);
  return `#${b.number}${p?.name ? ` ${p.name}` : ''}`;
}

/** Baskets in Game order (Video filename, then time) with the running score after each. */
export function scoringLog(game: Game) {
  const score: [number, number] = [0, 0];
  return [...game.baskets]
    .sort((a, b) => compareVideos(a.video, b.video) || a.time - b.time)
    .map((b) => {
      score[b.team] += b.points;
      return { ...b, score: [...score] as [number, number] };
    });
}

/** Adds the Player for this Team + number if it doesn't exist yet. */
export function withPlayer(game: Game, team: TeamIndex, number: number): Game {
  if (game.players.some((p) => p.team === team && p.number === number)) return game;
  return { ...game, players: [...game.players, { team, number }] };
}
