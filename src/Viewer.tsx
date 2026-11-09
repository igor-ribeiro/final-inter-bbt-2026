import { useEffect, useRef, useState } from 'react';
import {
  LEAD_IN_SEC,
  fetchGame,
  TEAM_COLORS,
  playerLabel,
  scoringLog,
  shortName,
  sortedVideos,
  type Game,
  type LogRow,
  type TeamId,
} from './game';

const COLS = 'grid grid-cols-[minmax(0,1fr)_84px_minmax(0,1fr)]';
const LABEL = 'text-[11px] tracking-[0.14em] text-muted';

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
  const log = scoringLog(game);
  const final = log.at(-1)?.score;
  const [selected, setSelected] = useState<LogRow | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedId = useRef<string | null>(null);
  const pendingSeek = useRef<number | null>(null);

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
    // Call play() inside the tap, or iOS blocks it.
    v.play().catch(() => {});
  }

  const name = (t: TeamId) => game.teams[t].name;

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col overflow-hidden bg-bg text-text">
      <header className="flex flex-col gap-2 border-b border-line px-4 pt-3.5 pb-3">
        <div className={`flex items-center justify-between ${LABEL}`}>
          <span className="uppercase">{game.title}</span>
          <span>{final ? 'FINAL SCORE' : 'NOT STARTED'}</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="text-sm leading-[1.3] font-bold text-team-a uppercase">{name('A')}</div>
          <div className="flex items-baseline gap-1.5 text-[32px] font-extrabold tracking-[-0.02em] tabular-nums">
            <span className={final ? 'text-team-a' : 'text-dash'}>{final?.A ?? 0}</span>
            <span className="text-[22px] text-dash">–</span>
            <span className={final ? 'text-team-b' : 'text-dash'}>{final?.B ?? 0}</span>
          </div>
          <div className="text-right text-sm leading-[1.3] font-bold text-team-b uppercase">
            {name('B')}
          </div>
        </div>
      </header>

      {log.length === 0 ? (
        <div className="flex aspect-video w-full shrink-0 items-center justify-center bg-video">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#4A505A" strokeWidth="2" aria-hidden="true">
            <rect x="4" y="9" width="32" height="22" rx="3" />
            <path d="M17 15v10l8-5z" />
          </svg>
        </div>
      ) : (
        <div className="relative aspect-video w-full shrink-0 bg-black">
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
            <div className="pointer-events-none absolute top-2.5 left-2.5 flex gap-1.5 text-[11px] tracking-[0.08em]">
              <span className="rounded-[3px] bg-black/70 px-1.5 py-1">
                VIDEO {selected.videoIndex + 1}/{videos.length}
              </span>
              <span className="rounded-[3px] bg-black/70 px-1.5 py-1 text-text-2">−{LEAD_IN_SEC}s</span>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-line bg-surface px-4 py-2.5">
          <span className={LABEL}>NOW</span>
          <span className="text-[15px] font-bold uppercase" style={{ color: TEAM_COLORS[selected.team] }}>
            {shortName(name(selected.team))} +{selected.points}
          </span>
          <span className="grow truncate text-[15px] text-text-2">
            {playerLabel(game, selected) || 'Unknown player'}
          </span>
          <span className="text-[15px] font-bold tabular-nums">
            {selected.score.A}–{selected.score.B}
          </span>
        </div>
      )}

      <div className={`${COLS} shrink-0 border-b border-line px-3 py-2 ${LABEL} uppercase`}>
        <span className="text-right text-team-a">{shortName(name('A'))}</span>
        <span className="text-center">SCORE</span>
        <span className="text-team-b">{shortName(name('B'))}</span>
      </div>

      {log.length === 0 ? (
        <div className="flex grow flex-col items-center justify-center gap-2.5 px-8 pb-20 text-center">
          <div className="text-[15px] tracking-[0.1em] text-dash">0 – 0</div>
          <div className="text-[17px] font-bold">No baskets yet.</div>
          <div className="text-sm leading-[1.6] text-muted">
            Every made shot will show up here. Tap one to watch it.
          </div>
        </div>
      ) : (
        <div className="no-scrollbar grow overflow-y-auto pb-6">
          {log.map((row) => (
            <LogRowView
              key={row.id}
              row={row}
              who={playerLabel(game, row)}
              teamName={shortName(name(row.team))}
              selected={selected?.id === row.id}
              onPlay={() => play(row)}
            />
          ))}
          <div className={`px-4 pt-5 text-center ${LABEL}`}>END OF GAME</div>
        </div>
      )}
    </div>
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
      className="rounded-[3px] px-1.5 py-[3px] text-sm font-extrabold"
      style={selected ? { color: '#0B0D10', background: col } : { color: col, background: col + '24' }}
    >
      +{row.points}
    </span>
  );
  const player = <span className="truncate text-sm text-text-2">{who}</span>;
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
      {row.newVideo && (
        <div className={`flex items-center gap-2.5 px-4 pt-3.5 pb-1.5 ${LABEL}`}>
          <span>VIDEO {row.videoIndex + 1}</span>
          <span className="h-px grow bg-line" />
        </div>
      )}
      <button
        onClick={props.onPlay}
        aria-pressed={selected}
        aria-label={`${teamName} plus ${row.points}${who ? `, ${who}` : ''}, score ${row.score.A} to ${row.score.B}. Play.`}
        className={`${COLS} min-h-11 w-full items-center px-3 text-left ${selected ? 'bg-selected' : 'hover:bg-[#13171D]'}`}
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
        <span className="flex justify-center gap-[3px] text-[15px] tabular-nums">
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
