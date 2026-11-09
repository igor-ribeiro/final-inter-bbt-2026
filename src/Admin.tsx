import { useEffect, useRef, useState } from 'react';
import {
  TEAM_COLORS,
  clock,
  ensurePlayer,
  fetchGame,
  gameLog,
  scoringLog,
  sortedVideos,
  type Basket,
  type Game,
  type PeriodEnd,
  type TeamId,
} from './game';

// Sizes are the mockup's +1–2px, matching the viewer bump.
const LABEL = 'text-xs tracking-[0.12em] text-muted';
const GHOST = 'h-10 rounded border border-line-strong hover:bg-hover';
const KEYS: Record<TeamId, string[]> = { A: ['1', '2', '3'], B: ['8', '9', '0'] };
const TINT: Record<TeamId, string> = { A: 'rgba(94,162,255,0.14)', B: 'rgba(255,107,94,0.14)' };
const pad2 = (n: number) => String(n).padStart(2, '0');
const plural = (n: number) => `${n} ${n === 1 ? 'basket' : 'baskets'}`;
const STORAGE_KEY = 'final-inter-bbt-2026:game';

function loadLocal(): Game | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

/** Dev server: writes public/game.json (see vite.config.ts). Otherwise: downloads it. */
async function exportGame(game: Game): Promise<string> {
  const json = JSON.stringify(game, null, 2) + '\n';
  if (import.meta.env.DEV) {
    const r = await fetch('/api/save-game', { method: 'POST', body: json });
    if (!r.ok) throw new Error(await r.text());
    return 'Written to public/game.json';
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  Object.assign(document.createElement('a'), { href: url, download: 'game.json' }).click();
  URL.revokeObjectURL(url);
  return 'Downloaded game.json';
}

export default function Admin() {
  // Working copy lives in localStorage; game.json is only the starting point.
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  // Videos always come from game.json (the admin never edits them), so a
  // renamed or added video shows up without discarding the local marks.
  const load = () =>
    fetchGame()
      .then((file) => {
        const local = loadLocal();
        setGame(local ? { ...local, videos: file.videos } : file);
      })
      .catch((e) => setError(`Couldn't load game.json (${e})`));

  useEffect(() => {
    load();
  }, []);

  // ponytail: no debounce, localStorage writes are sync and tiny; marks must never be lost.
  function save(next: Game) {
    setGame(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaveError('');
    } catch (e) {
      setSaveError(`Not saved: ${e}`);
    }
  }

  // Called on the second click of Reset (no confirm(): dialogs can be blocked).
  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    load();
  }

  if (error) return <p className="p-8 text-team-b">{error}</p>;
  if (!game) return null;
  return <AdminScreen game={game} setGame={save} saveError={saveError} onReset={reset} />;
}

function AdminScreen(props: {
  game: Game;
  setGame: (g: Game) => void;
  saveError: string;
  onReset: () => void;
}) {
  const { game, setGame } = props;
  const [armReset, setArmReset] = useState(false);
  const [fileMsg, setFileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => setFileMsg(null), [game]); // any edit makes the file stale again
  const videos = sortedVideos(game);
  const [videoIndex, setVideoIndex] = useState(0);
  // '' = no Player, else "A:7" (team:number).
  const [player, setPlayer] = useState('');
  const selTeam = player ? (player[0] as TeamId) : null;
  const [lastId, setLastId] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  // Full screen: only the marking <section>, edge to edge, browser fullscreen when allowed.
  const [full, setFull] = useState(false);
  useEffect(() => {
    const sync = () => !document.fullscreenElement && setFull(false); // browser Esc exits
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  function toggleFull() {
    setFull(!full);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (!full) document.documentElement.requestFullscreen?.().catch(() => {});
  }
  const ref = useRef<HTMLVideoElement>(null);
  const numRef = useRef<HTMLSelectElement>(null);

  // Latest handler in a ref so the window listener is added once.
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e) => {
    const el = e.target as HTMLElement;
    if (el.matches('input, select, textarea')) {
      // Enter/Esc in the Player select hands the keyboard back to the shortcuts.
      if (el === numRef.current && (e.key === 'Enter' || e.key === 'Escape')) {
        e.preventDefault();
        el.blur();
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (el.matches('button') && (e.key === ' ' || e.key === 'Enter')) return; // keyboard-focused button
    for (const t of ['A', 'B'] as const) {
      const i = KEYS[t].indexOf(e.key);
      if (i >= 0) return mark(t, (i + 1) as Basket['points']);
    }
    const step = e.shiftKey ? 5 : 1;
    const actions: Record<string, () => void> = {
      ' ': togglePlay,
      f: toggleFull,
      q: () => markEnd('quarter'),
      p: () => markEnd('period'),
      ArrowLeft: () => seekTo(ref.current!.currentTime - step),
      ArrowRight: () => seekTo(ref.current!.currentTime + step),
    };
    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const video = videos[videoIndex];
  if (!video) return <p className="p-8 text-muted">No videos in game.json.</p>;

  const inVideo = game.baskets
    .filter((b) => b.videoId === video.id)
    .sort((a, b) => a.timeSec - b.timeSec);
  const log = scoringLog(game);
  // This video's Baskets and period ends, in time order, with labels ("END OF Q2") and scores.
  const listEntries = gameLog(game).filter((e) => e.videoIndex === videoIndex);
  const entering = log.filter((r) => r.videoIndex < videoIndex).at(-1)?.score;
  // Score at the playhead: everything before this video plus this video's Baskets up to now.
  const current = log
    .filter((r) => r.videoIndex < videoIndex || (r.videoIndex === videoIndex && r.timeSec <= time))
    .at(-1)?.score;
  const len = duration || video.durationSec || 0;
  const teamName = (t: TeamId) => game.teams[t].name;

  function goVideo(i: number) {
    setVideoIndex(Math.max(0, Math.min(videos.length - 1, i)));
    setLastId(null);
    setTime(0);
    setDuration(0);
  }

  function seekTo(t: number) {
    const v = ref.current!;
    v.currentTime = Math.max(0, Math.min(v.duration || Infinity, t));
    setTime(v.currentTime); // timeupdate lags while paused
  }

  function togglePlay() {
    const v = ref.current!;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function mark(team: TeamId, points: Basket['points']) {
    if (selTeam && selTeam !== team) return; // Player belongs to the other Team
    const n = selTeam ? Number(player.slice(2)) : undefined;
    const basket: Basket = {
      id: crypto.randomUUID(),
      videoId: video.id,
      timeSec: Math.round(ref.current!.currentTime * 100) / 100,
      team,
      points,
      ...(n === undefined ? {} : { playerNumber: n }),
    };
    setGame({ ...game, baskets: [...game.baskets, basket] });
    setLastId(basket.id);
    setPlayer('');
  }

  function markEnd(kind: PeriodEnd['kind']) {
    const end: PeriodEnd = {
      id: crypto.randomUUID(),
      videoId: video.id,
      timeSec: Math.round(ref.current!.currentTime * 100) / 100,
      kind,
    };
    setGame({ ...game, periodEnds: [...(game.periodEnds ?? []), end] });
    setLastId(end.id);
  }

  function remove(id: string) {
    setGame({
      ...game,
      baskets: game.baskets.filter((b) => b.id !== id),
      periodEnds: (game.periodEnds ?? []).filter((e) => e.id !== id),
    });
  }

  return (
    <div
      className="min-h-screen bg-bg text-[15px] text-text"
      // Clicked buttons don't keep focus, so Space/Enter never re-fire the last mark.
      onMouseDown={(e) => (e.target as HTMLElement).closest('button') && e.preventDefault()}
    >
      <div className={`mx-auto flex flex-col gap-6 ${full ? 'p-4' : 'max-w-[1376px] px-8 pt-6 pb-12'}`}>
        <header className={`flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5 ${full ? 'hidden' : ''}`}>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs tracking-[0.14em] text-muted">ADMIN</span>
            <h1 className="text-[22px] font-extrabold tracking-[-0.01em]">{game.title}</h1>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            {(['A', 'B'] as const).map((t) => (
              <label key={t} className={`flex flex-col gap-1.5 ${LABEL}`}>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm" style={{ background: TEAM_COLORS[t] }} />
                  TEAM {t}
                </span>
                <input
                  type="text"
                  value={teamName(t)}
                  onChange={(e) =>
                    setGame({ ...game, teams: { ...game.teams, [t]: { name: e.target.value } } })
                  }
                  className="h-10 w-[260px] rounded border border-line-strong bg-surface-2 px-3 text-[15px] tracking-normal text-text"
                />
              </label>
            ))}
            {props.saveError ? (
              <span className="flex h-10 items-center text-xs text-team-b">{props.saveError}</span>
            ) : (
              <span className="flex h-10 items-center gap-1.5 text-xs text-muted">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#3DD68C" strokeWidth="2" aria-hidden="true">
                  <path d="M2 6.5l2.5 2.5L10 3.5" />
                </svg>
                Saved
              </span>
            )}
            <button
              onClick={() =>
                exportGame(game).then(
                  (text) => setFileMsg({ ok: true, text }),
                  (e) => setFileMsg({ ok: false, text: `Save failed: ${e.message ?? e}` }),
                )
              }
              className={`${GHOST} px-3 text-text-2`}
            >
              {import.meta.env.DEV ? 'Save to public/game.json' : 'Export game.json'}
            </button>
            {fileMsg && (
              <span className={`flex h-10 items-center text-xs ${fileMsg.ok ? 'text-ok' : 'text-team-b'}`}>
                {fileMsg.text}
              </span>
            )}
            <button
              onClick={() => {
                if (armReset) return setArmReset(false), props.onReset();
                setArmReset(true);
                setTimeout(() => setArmReset(false), 3000); // disarm if not confirmed
              }}
              className={`${GHOST} px-3 ${armReset ? 'border-team-b text-team-b' : 'text-muted'}`}
            >
              {armReset ? 'Click again to discard' : 'Reset to game.json'}
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-start gap-6">
          <section className="@container flex min-w-0 flex-[999_1_640px] flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="video" className={LABEL}>
                VIDEO
              </label>
              <select
                id="video"
                value={videoIndex}
                onChange={(e) => {
                  goVideo(Number(e.target.value));
                  e.target.blur(); // give the keys back to the shortcuts
                }}
                className="h-10 min-w-[280px] rounded border border-line-strong bg-surface-2 px-3"
              >
                {videos.map((v, i) => (
                  <option key={v.id} value={i}>
                    Video {pad2(i + 1)} — {plural(game.baskets.filter((b) => b.videoId === v.id).length)}
                  </option>
                ))}
              </select>
              <button onClick={() => goVideo(videoIndex - 1)} disabled={videoIndex === 0} className={`${GHOST} px-3 text-text-2 disabled:opacity-40`}>
                ← Prev
              </button>
              <button
                onClick={() => goVideo(videoIndex + 1)}
                disabled={videoIndex === videos.length - 1}
                className={`${GHOST} px-3 text-text-2 disabled:opacity-40`}
              >
                Next →
              </button>
              {full && (
                <span className="flex items-baseline gap-1.5 px-2 text-[22px] font-extrabold tabular-nums">
                  <span className="text-team-a">{current?.A ?? 0}</span>
                  <span className="text-base text-dash">–</span>
                  <span className="text-team-b">{current?.B ?? 0}</span>
                </span>
              )}
              <span className="ml-auto text-sm text-muted">
                Score entering this video:{' '}
                <span className="font-bold text-text tabular-nums">
                  {entering?.A ?? 0}–{entering?.B ?? 0}
                </span>
              </span>
              <button onClick={toggleFull} className={`${GHOST} px-3 text-text-2`}>
                {full ? 'Exit full screen' : 'Full screen'}
              </button>
            </div>

            {/* In full screen, cap the height so the mark buttons stay on screen (video pillarboxes). */}
            <div
              className={`relative aspect-video w-full overflow-hidden rounded-md border border-line bg-video ${full ? 'max-h-[calc(100dvh-384px)]' : ''}`}
            >
              <video
                ref={ref}
                src={video.src}
                preload="auto"
                playsInline
                onClick={togglePlay}
                className="size-full bg-black object-contain"
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration);
                  e.currentTarget.playbackRate = rate;
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              <div className="pointer-events-none absolute top-3 left-3 rounded-[3px] bg-black/70 px-2 py-[5px] text-xs tracking-[0.1em]">
                VIDEO {pad2(videoIndex + 1)}/{videos.length} · {decodeURI(video.src.split('/').pop() ?? '')}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3.5 py-3">
                <div
                  className="relative h-1 cursor-pointer rounded-sm bg-[#3A3F48]"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    seekTo(((e.clientX - r.left) / r.width) * len);
                  }}
                >
                  <div className="absolute top-0 left-0 h-1 rounded-sm bg-text" style={{ width: `${len ? (time / len) * 100 : 0}%` }} />
                  {len > 0 &&
                    listEntries.map((e) => (
                      <div
                        key={e.id}
                        className={`absolute w-0.5 ${e.type === 'end' ? '-top-2 h-5 bg-text' : '-top-1 h-3'}`}
                        style={{
                          left: `${(e.timeSec / len) * 100}%`,
                          background: e.type === 'basket' ? TEAM_COLORS[e.team] : undefined,
                        }}
                      />
                    ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-[120px] text-[28px] font-extrabold tabular-nums">{clock(time)}</span>
              <span className="mr-3 text-muted tabular-nums">/ {clock(len)}</span>
              <button onClick={() => seekTo(time - 5)} className={`${GHOST} min-w-[52px]`}>−5s</button>
              <button onClick={() => seekTo(time - 1)} className={`${GHOST} min-w-[52px]`}>−1s</button>
              <button
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
                className="flex h-10 w-[52px] items-center justify-center rounded bg-text"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  {playing ? (
                    <path d="M3 2h3v10H3zM8 2h3v10H8z" fill="#0B0D10" />
                  ) : (
                    <path d="M3 1.5v11l9-5.5z" fill="#0B0D10" />
                  )}
                </svg>
              </button>
              <button onClick={() => seekTo(time + 1)} className={`${GHOST} min-w-[52px]`}>+1s</button>
              <button onClick={() => seekTo(time + 5)} className={`${GHOST} min-w-[52px]`}>+5s</button>
              <span className="ml-auto flex gap-1">
                {[0.5, 1, 2].map((r) => (
                  <button
                    key={r}
                    aria-pressed={rate === r}
                    onClick={() => {
                      setRate(r);
                      ref.current!.playbackRate = r;
                    }}
                    className={`h-10 rounded px-2.5 ${rate === r ? 'bg-hover text-text' : 'text-muted hover:text-text'}`}
                  >
                    {r}×
                  </button>
                ))}
              </span>
            </div>

            {/* One row when the section is ≥768px wide, else three rows: A / Player / B. */}
            <div className="grid grid-cols-1 items-end gap-4 rounded-md border border-line bg-surface p-4 @3xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              {/* Visual order: Team A | Player # | Team B */}
              <label className={`order-2 flex flex-col items-center gap-1.5 ${LABEL}`}>
                PLAYER
                <select
                  ref={numRef}
                  value={player}
                  onChange={(e) => {
                    setPlayer(e.target.value);
                    e.target.blur(); // give the keys back to the shortcuts
                  }}
                  className="h-12 w-full rounded border border-line-strong bg-bg px-3 text-[15px] font-bold tracking-normal @3xl:h-[72px] @3xl:w-[200px]"
                  style={{ color: selTeam ? TEAM_COLORS[selTeam] : undefined }}
                >
                  <option value="">— No player —</option>
                  {(['A', 'B'] as const).map((t) => (
                    <optgroup key={t} label={teamName(t)}>
                      {game.players
                        .filter((p) => p.team === t)
                        .sort((a, b) => a.number - b.number)
                        .map((p) => (
                          <option key={p.number} value={`${t}:${p.number}`}>
                            #{p.number}
                            {p.name ? ` ${p.name}` : ''}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {(['A', 'B'] as const).map((t) => (
                <div key={t} className={`flex min-w-0 flex-col gap-1.5 ${t === 'A' ? 'order-1' : 'order-3'}`}>
                  <span className={`truncate ${LABEL} uppercase`} style={{ color: TEAM_COLORS[t] }}>
                    {teamName(t)}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {([1, 2, 3] as const).map((pts, i) => (
                      <button
                        key={pts}
                        onClick={() => mark(t, pts)}
                        disabled={selTeam !== null && selTeam !== t}
                        aria-label={`${teamName(t)} plus ${pts} (key ${KEYS[t][i]})`}
                        className="flex h-[72px] flex-col items-center justify-center gap-1 rounded border hover:brightness-115 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:brightness-100 disabled:active:translate-y-0"
                        style={{ background: TINT[t], borderColor: TEAM_COLORS[t], color: TEAM_COLORS[t] }}
                      >
                        <span className="text-2xl font-extrabold">+{pts}</span>
                        <span className="rounded-[3px] border border-line-strong px-[5px] py-px text-[11px] text-muted">
                          {KEYS[t][i]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['quarter', 'End of quarter', 'Q'],
                  ['period', 'End of period', 'P'],
                ] as const
              ).map(([kind, label, key]) => (
                <button
                  key={kind}
                  onClick={() => markEnd(kind)}
                  aria-label={`${label} (key ${key})`}
                  className={`${GHOST} flex items-center gap-2 px-3 text-text-2`}
                >
                  {label}
                  <span className="rounded-[3px] border border-line-strong px-[5px] py-px text-[11px] text-muted">{key}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              Marks at the current time. Pick a Player (optional; clears after each mark), then
              click or press 1/2/3 · 8/9/0. Q / P end a quarter / period. Add Players below. Space play/pause · ← → 1s · Shift+← → 5s · F full screen
            </p>
          </section>

          <aside className={`flex min-w-0 flex-[1_1_380px] flex-col rounded-md border border-line bg-surface ${full ? 'hidden' : ''}`}>
            <div className="flex items-baseline justify-between border-b border-line px-4 py-3.5">
              <span className="text-xs tracking-[0.14em] text-muted">BASKETS IN VIDEO {pad2(videoIndex + 1)}</span>
              <span className="text-sm text-text-2">{plural(inVideo.length)}</span>
            </div>
            <div className="grid grid-cols-[64px_minmax(0,1fr)_44px_64px_44px] gap-2 border-b border-line px-4 py-2 text-[11px] tracking-[0.12em] text-muted">
              <span>TIME</span>
              <span>TEAM</span>
              <span>PTS</span>
              <span>PLAYER</span>
              <span />
            </div>
            {listEntries.length === 0 && (
              <div className="px-4 py-10 text-center text-muted">No baskets in this video yet.</div>
            )}
            <div className="max-h-[640px] overflow-y-auto">
              {listEntries.map((b) =>
                b.type === 'end' ? (
                  <div
                    key={b.id}
                    className={`grid min-h-11 grid-cols-[64px_minmax(0,1fr)_44px] items-center gap-2 border-b border-line-faint px-4 ${b.id === lastId ? 'bg-just-added' : 'bg-bg'}`}
                  >
                    <button
                      onClick={() => seekTo(b.timeSec)}
                      aria-label={`Jump to ${clock(b.timeSec)}`}
                      className="h-11 text-left tabular-nums hover:underline"
                    >
                      {clock(b.timeSec)}
                    </button>
                    <span className="flex items-baseline gap-3">
                      <span className="text-xs font-bold tracking-[0.14em] text-text-2">{b.label}</span>
                      <span className="font-extrabold tabular-nums">
                        {b.score.A}–{b.score.B}
                      </span>
                    </span>
                    <button
                      onClick={() => remove(b.id)}
                      aria-label={`Delete ${b.label.toLowerCase()} at ${clock(b.timeSec)}`}
                      className="flex size-9 items-center justify-center rounded text-muted hover:bg-hover hover:text-team-b"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
                      </svg>
                    </button>
                  </div>
                ) : (
                <div
                  key={b.id}
                  className={`grid min-h-11 grid-cols-[64px_minmax(0,1fr)_44px_64px_44px] items-center gap-2 border-b border-line-faint px-4 ${b.id === lastId ? 'bg-just-added' : ''}`}
                >
                  <button
                    onClick={() => seekTo(b.timeSec)}
                    aria-label={`Jump to ${clock(b.timeSec)}`}
                    className="h-11 text-left tabular-nums hover:underline"
                  >
                    {clock(b.timeSec)}
                  </button>
                  <span className="flex min-w-0 items-center gap-2" style={{ color: TEAM_COLORS[b.team] }}>
                    <span className="size-2 shrink-0 rounded-sm" style={{ background: TEAM_COLORS[b.team] }} />
                    <span className="truncate">{teamName(b.team)}</span>
                  </span>
                  <span className="font-extrabold">+{b.points}</span>
                  <span className={b.playerNumber === undefined ? 'text-faint' : 'text-text'}>
                    {b.playerNumber === undefined ? '—' : `#${b.playerNumber}`}
                  </span>
                  <button
                    onClick={() => remove(b.id)}
                    aria-label={`Delete basket at ${clock(b.timeSec)}`}
                    className="flex size-9 items-center justify-center rounded text-muted hover:bg-hover hover:text-team-b"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
                    </svg>
                  </button>
                </div>
                ),
              )}
            </div>
          </aside>
        </div>
        <section className={`flex flex-col gap-3.5 pt-2 ${full ? 'hidden' : ''}`}>
          <div className="flex items-baseline gap-3">
            <h2 className="text-xs font-medium tracking-[0.14em] text-muted">PLAYERS</h2>
            <span className="text-xs text-muted">
              Add Players here to pick them when marking. Names are optional.
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
            {(['A', 'B'] as const).map((t) => {
              const roster = game.players
                .filter((p) => p.team === t)
                .sort((a, b) => a.number - b.number);
              return (
                <div key={t} className="flex flex-col rounded-md border border-line bg-surface">
                  <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                    <span className="size-2 rounded-sm" style={{ background: TEAM_COLORS[t] }} />
                    <span className="font-bold" style={{ color: TEAM_COLORS[t] }}>
                      {teamName(t)}
                    </span>
                    <span className="ml-auto text-xs text-muted">{roster.length} players</span>
                  </div>
                  {roster.map((p) => (
                    <label
                      key={p.number}
                      className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2 border-b border-line-faint px-4 py-1.5"
                    >
                      <span className="font-extrabold tabular-nums">#{p.number}</span>
                      <input
                        type="text"
                        placeholder="Name (optional)"
                        aria-label={`Name for #${p.number}`}
                        value={p.name ?? ''}
                        onChange={(e) =>
                          setGame({
                            ...game,
                            players: game.players.map((q) =>
                              q === p ? { ...p, name: e.target.value || undefined } : q,
                            ),
                          })
                        }
                        className="h-9 rounded border border-line bg-bg px-2.5 text-[15px] text-text"
                      />
                    </label>
                  ))}
                  <form
                    className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const f = new FormData(form);
                      const n = Number(f.get('number'));
                      const name = String(f.get('name')).trim() || undefined;
                      const g = ensurePlayer(game, t, n);
                      setGame({
                        ...g,
                        // An existing number just gets the name, if one was typed.
                        players: g.players.map((p) =>
                          p.team === t && p.number === n ? { ...p, name: name ?? p.name } : p,
                        ),
                      });
                      form.reset();
                      (form.elements.namedItem('number') as HTMLInputElement).focus();
                    }}
                  >
                    <input
                      name="number"
                      type="text"
                      inputMode="numeric"
                      required
                      pattern="\d{1,2}"
                      maxLength={2}
                      placeholder="#"
                      aria-label={`New ${teamName(t)} player number`}
                      className="h-9 w-full rounded border border-line bg-bg text-center text-[15px] font-extrabold text-text"
                    />
                    <input
                      name="name"
                      type="text"
                      placeholder="Name (optional)"
                      aria-label={`New ${teamName(t)} player name`}
                      className="h-9 rounded border border-line bg-bg px-2.5 text-[15px] text-text"
                    />
                    <button className="h-9 rounded border border-line-strong px-3 text-text-2 hover:bg-hover">Add</button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
