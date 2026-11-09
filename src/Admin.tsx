import { useEffect, useRef, useState } from 'react';
import {
  compareVideos,
  playerLabel,
  videoUrl,
  withPlayer,
  type Basket,
  type Game,
  type TeamIndex,
} from './game';

const fmt = (t: number) =>
  `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export default function Admin() {
  // Read from disk, not via import: the bundled game.json is stale after saves.
  const [game, setGame] = useState<Game | null>(null);
  const [videos, setVideos] = useState<string[]>([]);
  const [video, setVideo] = useState('');
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const ref = useRef<HTMLVideoElement>(null);
  const saving = useRef(Promise.resolve());

  useEffect(() => {
    fetch('/api/game')
      .then((r) => r.json())
      .then(setGame);
    fetch('/api/videos')
      .then((r) => r.json())
      .then((v: string[]) => setVideos(v.sort(compareVideos)));
  }, []);

  function save(next: Game) {
    setGame(next);
    // Chain saves so the last edit is the last write.
    saving.current = saving.current
      .then(() => fetch('/api/game', { method: 'POST', body: JSON.stringify(next) }))
      .then((r) => setError(r.ok ? '' : `Save failed: ${r.status}`))
      .catch((e) => setError(`Save failed: ${e}`));
  }

  function mark(team: TeamIndex, points: Basket['points']) {
    if (!game) return;
    const n = number.trim() === '' ? undefined : Number(number);
    if (n !== undefined && !Number.isInteger(n)) return setError('Number must be an integer');
    const basket: Basket = { video, time: ref.current!.currentTime, team, points, number: n };
    const next = n === undefined ? game : withPlayer(game, team, n);
    save({ ...next, baskets: [...next.baskets, basket] });
    setNumber('');
  }

  if (!game) return <p className="p-4">Loading…</p>;

  const baskets = game.baskets
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.video === video)
    .sort((x, y) => x.b.time - y.b.time);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      {error && <p className="font-medium text-red-400">{error}</p>}

      <section className="flex gap-4">
        {game.teams.map((t, ti) => (
          <label key={ti} className="flex-1">
            Team {ti + 1}
            <input
              className="block w-full rounded border px-2 py-1"
              value={t.name}
              onChange={(e) => {
                const teams = [...game.teams] as Game['teams'];
                teams[ti] = { name: e.target.value };
                save({ ...game, teams });
              }}
            />
          </label>
        ))}
      </section>

      <select
        className="w-full rounded border px-2 py-1"
        value={video}
        onChange={(e) => setVideo(e.target.value)}
      >
        <option value="">Select a video…</option>
        {videos.map((v) => (
          <option key={v} value={v}>
            {v} ({game.baskets.filter((b) => b.video === v).length})
          </option>
        ))}
      </select>

      {video && (
        <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <video ref={ref} src={videoUrl(video)} controls className="w-full bg-black" />
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="w-24 rounded border px-2 py-1"
                placeholder="Player #"
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
              {game.teams.map((t, ti) =>
                ([1, 2, 3] as const).map((p) => (
                  <button
                    key={`${ti}${p}`}
                    onClick={() => mark(ti as TeamIndex, p)}
                    className={`rounded px-3 py-1 text-white ${ti === 0 ? 'bg-blue-600' : 'bg-red-600'}`}
                  >
                    {t.name} +{p}
                  </button>
                )),
              )}
            </div>
          </div>
          <ul className="space-y-1 text-sm">
            {baskets.map(({ b, i }) => (
              <li key={i} className="flex items-center gap-2">
                <button
                  className="underline"
                  onClick={() => (ref.current!.currentTime = b.time)}
                >
                  {fmt(b.time)}
                </button>
                <span className="flex-1">
                  {game.teams[b.team].name} +{b.points} {playerLabel(game, b)}
                </span>
                <button
                  className="text-red-400"
                  onClick={() => save({ ...game, baskets: game.baskets.filter((_, j) => j !== i) })}
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-bold">Players</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {game.teams.map((t, ti) => (
            <div key={ti}>
              <h3 className="font-medium">{t.name}</h3>
              {game.players
                .map((p, i) => ({ p, i }))
                .filter(({ p }) => p.team === ti)
                .sort((x, y) => x.p.number - y.p.number)
                .map(({ p, i }) => (
                  <label key={i} className="flex items-center gap-2">
                    <span className="w-10">#{p.number}</span>
                    <input
                      className="flex-1 rounded border px-2 py-1"
                      placeholder="Name (optional)"
                      value={p.name ?? ''}
                      onChange={(e) => {
                        const players = [...game.players];
                        players[i] = { ...p, name: e.target.value || undefined };
                        save({ ...game, players });
                      }}
                    />
                  </label>
                ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
