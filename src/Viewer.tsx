import { useEffect, useRef, useState } from 'react';
import {
  LEAD_IN_SEC,
  boxScore,
  fetchGame,
  gameLog,
  TEAM_COLORS,
  playerLabel,
  scoringLog,
  shortName,
  sortedVideos,
  type BoxRow,
  type EndRow,
  type Game,
  type LogRow,
  type TeamId,
} from './game';

// Phone sizes are the mockup's +1–2px; desk: sizes follow ViewerDesktop.dc.html.
// One DOM for both layouts (desk: = ≥900px), so the <video> never remounts.
const COLS = 'grid grid-cols-[minmax(0,1fr)_84px_minmax(0,1fr)]';
const LABEL = 'text-[11px] tracking-[0.14em] text-muted';
const SCROLL = 'max-desk:no-scrollbar desk:scroll-thin';
const GHOST =
  'hidden h-10 shrink-0 rounded border border-line-strong px-3 text-xs text-text-2 hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent desk:block';

export default function Viewer() {
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGame()
      .then(setGame)
      .catch((e) => setError(`Couldn't load game.json (${e})`));
  }, []);

  if (error) return <p className="p-4 text-sm text-team-b">{error}</p>;
  if (!game) return null;
  return <ViewerScreen game={game} />;
}

function ViewerScreen({ game }: { game: Game }) {
  const videos = sortedVideos(game);
  const entries = gameLog(game); // Baskets + period ends, for the Scoring log
  const log = scoringLog(game); // Baskets only: selection, Prev/Next, box score
  const final = log.at(-1)?.score;
  const [selected, setSelected] = useState<LogRow | null>(null);
  const [tab, setTab] = useState<Tab>(loadTab);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedId = useRef<string | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const name = (t: TeamId) => game.teams[t].name;

  // Show the first Video (paused) until a row is tapped.
  useEffect(() => {
    const v = videoRef.current;
    if (v && videos[0] && !loadedId.current) {
      loadedId.current = videos[0].id;
      v.src = videos[0].src;
    }
  }, [videos]);

  function play(row: LogRow) {
    const v = videoRef.current!;
    const video = videos[row.videoIndex];
    const start = Math.max(0, row.timeSec - LEAD_IN_SEC);
    setSelected(row);
    if (loadedId.current !== video.id) {
      loadedId.current = video.id;
      pendingSeek.current = start; // applied in onLoadedMetadata
      v.src = video.src;
    } else v.currentTime = start;
    // Call play() inside the tap/key, or iOS blocks it.
    v.play().catch(() => {});
  }

  // Prev/Next walk the whole log, across Videos. Next with nothing selected starts at Basket 1.
  const selIndex = selected ? log.findIndex((r) => r.id === selected.id) : -1;
  const step = (d: 1 | -1) => {
    const row = log[selIndex + d];
    if (row) play(row);
  };

  // ← / → anywhere except fields, tabs (they use arrows) and the video's own controls.
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if ((e.target as HTMLElement).closest('input, select, textarea, video, [role="tab"]')) return;
    e.preventDefault();
    step(e.key === 'ArrowLeft' ? -1 : 1);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Keep the selected row visible in the log (no-op when already visible or tab hidden).
  useEffect(() => {
    if (selected) document.getElementById(`row-${selected.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  function pickTab(t: Tab) {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* private mode etc: tab just isn't remembered */
    }
  }

  const scoreNum = (t: TeamId) => (
    <span className={final ? (t === 'A' ? 'text-team-a' : 'text-team-b') : 'text-dash'}>{final?.[t] ?? 0}</span>
  );

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col overflow-hidden bg-bg text-text desk:h-screen desk:min-h-[640px] desk:max-w-none">
      {/* Phone header */}
      <header className="flex shrink-0 flex-col gap-2 border-b border-line px-4 pt-3.5 pb-3 desk:hidden">
        <div className={`flex items-center justify-between ${LABEL}`}>
          <span className="uppercase">{game.title}</span>
          <span>{final ? 'FINAL SCORE' : 'NOT STARTED'}</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="text-sm leading-[1.3] font-bold text-team-a uppercase">{name('A')}</div>
          <div className="flex items-baseline gap-1.5 text-[32px] font-extrabold tracking-[-0.02em] tabular-nums">
            {scoreNum('A')}
            <span className="text-[22px] text-dash">–</span>
            {scoreNum('B')}
          </div>
          <div className="text-right text-sm leading-[1.3] font-bold text-team-b uppercase">{name('B')}</div>
        </div>
      </header>

      {/* Desktop header: one line */}
      <header className="hidden shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 border-b border-line px-8 py-4 desk:grid">
        <span className={`${LABEL} uppercase`}>{game.title}</span>
        <div className="flex items-center gap-5">
          <span className="text-right text-sm font-bold text-team-a uppercase">{name('A')}</span>
          <span className="flex items-baseline gap-2 text-[32px] font-extrabold tracking-[-0.02em] tabular-nums">
            {scoreNum('A')}
            <span className="text-[22px] text-dash">–</span>
            {scoreNum('B')}
          </span>
          <span className="text-sm font-bold text-team-b uppercase">{name('B')}</span>
        </div>
        <span className={`${LABEL} text-right`}>{final ? 'FINAL SCORE' : 'NOT STARTED'}</span>
      </header>

      <div className="flex min-h-0 grow flex-col desk:flex-row">
        {/* Player + NowStrip (phone) / left column (desktop) */}
        <section className={`shrink-0 desk:flex desk:min-w-0 desk:flex-1 desk:flex-col desk:gap-4 desk:overflow-y-auto desk:px-8 desk:py-6 ${SCROLL}`}>
          {log.length === 0 ? (
            <div className="flex aspect-video w-full shrink-0 items-center justify-center bg-video desk:rounded-md">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#4A505A" strokeWidth="2" aria-hidden="true">
                <rect x="4" y="9" width="32" height="22" rx="3" />
                <path d="M17 15v10l8-5z" />
              </svg>
            </div>
          ) : (
            <div className="relative aspect-video w-full shrink-0 bg-black desk:overflow-hidden desk:rounded-md">
              <video
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                className="size-full object-contain"
                onLoadedMetadata={(e) => {
                  if (pendingSeek.current === null) return;
                  e.currentTarget.currentTime = pendingSeek.current;
                  pendingSeek.current = null;
                }}
              />
              {selected && (
                <div className="pointer-events-none absolute top-2.5 left-2.5 flex gap-1.5 text-[11px] tracking-[0.08em] desk:top-3.5 desk:left-3.5">
                  <span className="rounded-[3px] bg-black/70 px-1.5 py-1 desk:px-2 desk:py-[5px]">
                    VIDEO {selected.videoIndex + 1}/{videos.length}
                  </span>
                  <span className="rounded-[3px] bg-black/70 px-1.5 py-1 text-text-2 desk:px-2 desk:py-[5px]">
                    −{LEAD_IN_SEC}s
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Phone: strip, only once something is selected. Desktop: card, always (Next starts the walk). */}
          {log.length > 0 && (
            <div
              className={`${selected ? 'flex' : 'hidden desk:flex'} items-center gap-2.5 border-b border-line bg-surface px-4 py-2.5 desk:shrink-0 desk:gap-4 desk:rounded-md desk:border desk:py-3.5`}
            >
              <button onClick={() => step(-1)} disabled={selIndex <= 0} aria-label="Previous basket" className={GHOST}>
                ← Prev
              </button>
              <span className={LABEL}>NOW</span>
              {selected ? (
                <>
                  <span
                    className="text-[15px] font-bold uppercase desk:text-base desk:font-extrabold"
                    style={{ color: TEAM_COLORS[selected.team] }}
                  >
                    {shortName(name(selected.team))} +{selected.points}
                  </span>
                  <span className="grow truncate text-[15px] text-text-2">
                    {playerLabel(game, selected) || 'Unknown player'}
                  </span>
                  <span className="text-[15px] font-bold tabular-nums desk:text-lg desk:font-extrabold">
                    {selected.score.A}–{selected.score.B}
                  </span>
                  <span className="hidden text-xs text-muted desk:inline">
                    {selIndex + 1} of {log.length}
                  </span>
                </>
              ) : (
                <span className="grow truncate text-[15px] text-muted">Pick a basket, or press Next.</span>
              )}
              <button
                onClick={() => step(1)}
                disabled={selIndex >= log.length - 1}
                aria-label="Next basket"
                className={GHOST}
              >
                Next →
              </button>
            </div>
          )}
        </section>

        {/* Tabs + panels (phone: below; desktop: fixed right panel) */}
        <aside className="flex min-h-0 grow flex-col desk:w-[460px] desk:flex-none desk:border-l desk:border-line desk:bg-panel">
          <Tabs tab={tab} onPick={pickTab} />

          {/* Both panels stay mounted (hidden) so each keeps its scroll position. */}
          <div role="tabpanel" id="panel-log" aria-labelledby="tab-log" hidden={tab !== 'log'} className="flex min-h-0 grow flex-col">
            <div className={`${COLS} shrink-0 border-b border-line px-3 py-2 ${LABEL} uppercase desk:px-4 desk:py-2.5 desk:text-[10px]`}>
              <span className="text-right text-team-a">{shortName(name('A'))}</span>
              <span className="text-center">SCORE</span>
              <span className="text-team-b">{shortName(name('B'))}</span>
            </div>
            {log.length === 0 ? (
              <EmptyMessage />
            ) : (
              <div className={`min-h-0 grow overflow-y-auto pb-6 ${SCROLL}`}>
                {entries.map((e) =>
                  e.type === 'end' ? (
                    <EndRowView key={e.id} row={e} />
                  ) : (
                    <LogRowView
                      key={e.id}
                      row={e}
                      who={playerLabel(game, e)}
                      teamName={shortName(name(e.team))}
                      selected={selected?.id === e.id}
                      onPlay={() => play(e)}
                    />
                  ),
                )}
                <div className={`px-4 pt-5 text-center ${LABEL} desk:text-[10px]`}>END OF GAME</div>
              </div>
            )}
          </div>

          <div role="tabpanel" id="panel-box" aria-labelledby="tab-box" hidden={tab !== 'box'} className="flex min-h-0 grow flex-col">
            {log.length === 0 ? (
              <EmptyMessage />
            ) : (
              <div className={`grid min-h-0 grow grid-cols-2 items-start overflow-y-auto pb-6 ${SCROLL}`}>
                {(['A', 'B'] as const).map((t) => (
                  <BoxColumn key={t} game={game} team={t} rows={boxScore(log, t)} total={final?.[t] ?? 0} />
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

type Tab = 'log' | 'box';
const TAB_KEY = 'final-inter-bbt-2026:tab';
const TABS: [Tab, string][] = [
  ['log', 'SCORING LOG'],
  ['box', 'BOX SCORE'],
];

function loadTab(): Tab {
  try {
    return localStorage.getItem(TAB_KEY) === 'box' ? 'box' : 'log';
  } catch {
    return 'log';
  }
}

function Tabs({ tab, onPick }: { tab: Tab; onPick: (t: Tab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Game views"
      className="grid shrink-0 grid-cols-2 border-b border-line"
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const next: Tab = tab === 'log' ? 'box' : 'log'; // two tabs: either arrow flips
        onPick(next);
        document.getElementById(`tab-${next}`)?.focus();
      }}
    >
      {TABS.map(([id, label]) => (
        <button
          key={id}
          id={`tab-${id}`}
          role="tab"
          aria-selected={tab === id}
          aria-controls={`panel-${id}`}
          tabIndex={tab === id ? 0 : -1}
          onClick={() => onPick(id)}
          className={`h-11 text-center text-xs font-bold tracking-[0.14em] desk:h-12 desk:text-[11px] ${tab === id ? 'text-text shadow-[inset_0_-2px_0_#E6E8EB]' : 'text-muted'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function EmptyMessage() {
  return (
    <div className="flex grow flex-col items-center justify-center gap-2.5 px-8 pb-20 text-center">
      <div className="text-[15px] tracking-[0.1em] text-dash">0 – 0</div>
      <div className="text-[17px] font-bold">No baskets yet.</div>
      <div className="text-sm leading-[1.6] text-muted">Every made shot will show up here. Tap one to watch it.</div>
    </div>
  );
}

function BoxColumn(props: { game: Game; team: TeamId; rows: BoxRow[]; total: number }) {
  const { game, team, rows } = props;
  const color = TEAM_COLORS[team];
  const nameOf = (n: number) => game.players.find((p) => p.team === team && p.number === n)?.name ?? '';
  return (
    <div className={`flex min-w-0 flex-col ${team === 'A' ? 'border-r border-line' : ''}`}>
      <div className="flex flex-col gap-1 border-b border-line px-3 pt-3.5 pb-3 desk:px-4 desk:pt-4 desk:pb-3.5">
        <span className="truncate text-[11px] font-bold tracking-[0.12em] uppercase desk:text-[10px]" style={{ color }}>
          {game.teams[team].name}
        </span>
        <span className="text-[26px] font-extrabold tabular-nums desk:text-[28px]" style={{ color }}>
          {props.total}
        </span>
      </div>
      <div className="flex justify-between border-b border-line px-3 py-2 text-[11px] tracking-[0.12em] text-muted desk:px-4 desk:text-[10px]">
        <span>PLAYER</span>
        <span>PTS</span>
      </div>
      {rows.map((r) => (
        <div key={r.number ?? 'none'} className="flex flex-col gap-1 border-b border-line-faint px-3 py-2.5 desk:px-4">
          <div className="flex min-w-0 items-baseline gap-1.5">
            {r.number !== null && <span className="shrink-0 text-sm font-extrabold desk:text-[13px]">#{r.number}</span>}
            <span className={`grow truncate text-sm desk:text-[13px] ${r.number === null ? 'text-muted' : 'text-text-2'}`}>
              {r.number === null ? 'No player' : nameOf(r.number)}
            </span>
            <span className="text-[17px] font-extrabold tabular-nums desk:text-base">{r.points}</span>
          </div>
          <span className="text-xs tracking-[0.08em] text-muted tabular-nums desk:text-[11px]">{r.timeline.join(' ')}</span>
        </div>
      ))}
    </div>
  );
}

function VideoDivider({ index }: { index: number }) {
  return (
    <div className={`flex items-center gap-2.5 px-4 pt-3.5 pb-1.5 ${LABEL} desk:text-[10px]`}>
      <span>VIDEO {index + 1}</span>
      <span className="h-px grow bg-line" />
    </div>
  );
}

/** "END OF Q2" with the score at that moment, centered on the score column. Not interactive. */
function EndRowView({ row }: { row: EndRow }) {
  return (
    <>
      {row.newVideo && <VideoDivider index={row.videoIndex} />}
      <div className={`${COLS} min-h-9 items-center border-y border-line bg-surface px-3 desk:px-4`}>
        <span className="pr-2 text-right text-[11px] font-bold tracking-[0.14em] text-text-2 desk:text-[10px]">
          {row.label}
        </span>
        <span className="text-center text-[15px] font-extrabold tabular-nums desk:text-sm">
          {row.score.A}
          <span className="px-[3px] font-normal text-dash">–</span>
          {row.score.B}
        </span>
        <span />
      </div>
    </>
  );
}

function LogRowView(props: {
  row: LogRow;
  who: string;
  teamName: string;
  selected: boolean;
  onPlay: () => void;
}) {
  const { row, who, teamName, selected } = props;
  const col = TEAM_COLORS[row.team];
  const badge = (
    <span
      className="rounded-[3px] px-1.5 py-[3px] text-sm font-extrabold desk:text-xs"
      style={selected ? { color: '#0B0D10', background: col } : { color: col, background: col + '24' }}
    >
      +{row.points}
    </span>
  );
  const player = <span className="truncate text-sm text-text-2 desk:text-[13px]">{who}</span>;
  const scoreSpan = (t: TeamId) => (
    <span
      className={row.team === t ? 'font-extrabold' : 'font-normal text-muted'}
      style={row.team === t ? { color: col } : undefined}
    >
      {row.score[t]}
    </span>
  );

  return (
    <>
      {row.newVideo && <VideoDivider index={row.videoIndex} />}
      <button
        id={`row-${row.id}`}
        onClick={props.onPlay}
        aria-pressed={selected}
        aria-label={`${teamName} plus ${row.points}${who ? `, ${who}` : ''}, score ${row.score.A} to ${row.score.B}. Play.`}
        className={`${COLS} min-h-11 w-full items-center px-3 text-left desk:px-4 ${selected ? 'bg-selected' : 'hover:bg-[#13171D]'}`}
        style={selected ? { boxShadow: `inset 0 0 0 1px ${col}` } : undefined}
      >
        <span className="flex min-w-0 items-center justify-end gap-2">
          {row.team === 'A' && (
            <>
              {player}
              {badge}
            </>
          )}
        </span>
        <span className="flex justify-center gap-[3px] text-[15px] tabular-nums desk:text-sm">
          {scoreSpan('A')}
          <span className="text-dash">–</span>
          {scoreSpan('B')}
        </span>
        <span className="flex min-w-0 items-center justify-start gap-2">
          {row.team === 'B' && (
            <>
              {badge}
              {player}
            </>
          )}
        </span>
      </button>
    </>
  );
}
