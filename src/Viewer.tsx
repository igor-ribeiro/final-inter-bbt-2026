import { useRef } from 'react';
import data from './game.json';
import { playerLabel, scoringLog, videoUrl, type Basket, type Game } from './game';

const game = data as unknown as Game;
const LEAD_IN = 5; // seconds shown before each Basket

export default function Viewer() {
  const ref = useRef<HTMLVideoElement>(null);
  const log = scoringLog(game);

  function play(b: Basket) {
    const v = ref.current!;
    const seek = () => {
      v.currentTime = Math.max(0, b.time - LEAD_IN);
      v.play();
    };
    if (v.getAttribute('src') !== videoUrl(b.video)) {
      v.src = videoUrl(b.video);
      v.addEventListener('loadedmetadata', seek, { once: true });
    } else seek();
  }

  const side = (b: Basket, team: 0 | 1) => {
    if (b.team !== team) return null;
    const label = playerLabel(game, b);
    const parts = [label, `${game.teams[team].name} +${b.points}`].filter(Boolean);
    return (team === 0 ? parts : parts.reverse()).join(' - ');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="sticky top-0 z-10 bg-black">
        <video ref={ref} controls playsInline className="aspect-video w-full" />
      </div>
      <h1 className="p-4 text-center text-xl font-bold">
        {game.teams[0].name} vs {game.teams[1].name}
      </h1>
      {log.length === 0 && <p className="p-4 text-center text-neutral-500">No baskets yet.</p>}
      <ul>
        {log.map((b, i) => (
          <li key={i}>
            <button
              onClick={() => play(b)}
              className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900"
            >
              <span className="text-right font-medium text-blue-400">{side(b, 0)}</span>
              <span className="w-16 text-center tabular-nums">
                {b.score[0]}–{b.score[1]}
              </span>
              <span className="text-left font-medium text-red-400">{side(b, 1)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
