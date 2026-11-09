# Final Inter BBT 2026 — Design handoff

Read with `docs/brief.md` (what the product is) and `docs/design/*.dc.html` (how it looks).

## About the design files

The `.dc.html` files are design mockups, **not code to copy**. Treat them as the visual spec:

- Inline `style="…"` attributes are the exact colors, sizes and spacing. Match them with Tailwind.
- `{{hole}}`, `<sc-for>` and `<sc-if>` are template syntax (loop, conditional). Ignore the syntax and keep what it means.
- The `<script>` block at the bottom of each file holds the mockup's logic (running score, selection, adding and deleting). It shows the intended behavior. Its data is made-up sample data.

| File | Screen |
|---|---|
| `Main.dc.html` | Viewer, phone (390 px wide), game in progress |
| `ViewerEmpty.dc.html` | Viewer, no Baskets yet |
| `Admin.dc.html` | Admin, desktop, fluid width (max content width 1376 px) |

## Design tokens

Put these in `tailwind.config` (`theme.extend`).

**Colors**

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0B0D10` | page background |
| `surface` | `#101318` | panels, "Now" strip |
| `surface-2` | `#13161B` | inputs on bg |
| `video` | `#15181D` | empty video area |
| `hover` | `#1A1F27` | hover / active pill |
| `selected` | `#161B22` | selected log row |
| `just-added` | `#1A2130` | newly marked Basket row (admin) |
| `line` | `#23272F` | borders, dividers |
| `line-strong` | `#2C313A` | input and button borders |
| `line-faint` | `#1A1E25` | list row separators |
| `text` | `#E6E8EB` | primary text |
| `text-2` | `#C9CDD3` | secondary text (player names) |
| `muted` | `#8A9099` | labels, captions |
| `faint` | `#6B717B` | placeholders, "—" |
| `dash` | `#4A505A` | the "–" in scores |
| `team-a` | `#5EA2FF` | Team A (blue) |
| `team-b` | `#FF6B5E` | Team B (coral red) |
| `ok` | `#3DD68C` | "Saved" check |

Team tints: team color at ~14% opacity for button fills (`rgba(94,162,255,.14)`, `rgba(255,107,94,.14)`), and ~14% (`hex + "24"`) for unselected log badges. Keep team colors in one place, because the admin can't change them yet but may later.

**Type**: JetBrains Mono (Google Fonts, weights 400/500/700/800) everywhere, falling back to `ui-monospace, monospace`. Use `font-variant-numeric: tabular-nums` (`tabular-nums`) on every score and time.

| Use | Size / weight |
|---|---|
| Small caps labels ("SCORE", "VIDEO 3") | 10–11 px, uppercase, `letter-spacing: 0.12–0.14em`, `muted` |
| Log rows, body | 12–13 px |
| Header final score | 28 px / 800 |
| Admin current time | 26 px / 800 |
| Mark buttons "+2" | 22 px / 800 |
| Player # input | 30 px / 800 |

**Shape**: radius 3 px (badges), 4 px (inputs, buttons), 6 px (panels). Minimum touch target 44 px.

## Components

### Viewer (`/`)

Full-height column, `h-dvh`, nothing scrolls except the log.

- **ScoreHeader**: "FINAL · INTER BBT 2026" label; team names (uppercase, team color, 12 px bold, wrap to 2 lines); final score in the center.
- **PinnedPlayer**: 16:9 box, full width, `bg-black`. Vertical videos are pillarboxed (`object-contain`) so the player height never changes. Overlay chips: "VIDEO n/10" and "−5s".
- **NowStrip**: "NOW", "PIVÔS +3" in team color, player ("#7 João", or "Unknown player"), score after the Basket.
- **LogHeader**: three columns `1fr 76px 1fr`, team short names in team colors, "SCORE" centered.
- **ScoringLog**: the only scroll area (hide the scrollbar). Contains:
  - **VideoDivider**: "VIDEO 3" plus a 1 px line, before the first Basket of each Video.
  - **LogRow**: a `<button>` (full width, min-height 44 px, grid `1fr 76px 1fr`).
    - Team A side, right-aligned toward the center: `[player] [+N badge]`.
    - Team B side, left-aligned: `[+N badge] [player]`.
    - Center: running score; the scoring team's number in its color and weight 800, the other in `muted` and weight 400.
    - Player text: `#7 João`, `#12` (no name), or nothing (no Player).
    - Selected: `bg-selected`, inset 1 px ring in team color, badge becomes solid (team color background, `bg`-colored text).
    - `aria-pressed` on the selected row, plus an `aria-label` like "Pivôs plus 3, #7 João, score 24 to 21. Play."
  - "END OF GAME" footer label.
- **Empty state**: score shows 0–0 in `dash` color, video area shows a muted icon, log area shows "No baskets yet." and "Every made shot will show up here. Tap one to watch it."

### Admin (`/admin`)

Desktop only. Not linked from the viewer.

- **Header**: title, two team name inputs (260 px, save as you type, debounced) with team color squares, and a "Saved" indicator.
- **VideoPicker**: `<select>` with options like "Video 04 — 4 baskets", Prev/Next buttons, and "Score entering this video: 31–30" on the right.
- **AdminPlayer**: 16:9, `object-contain`. The progress bar shows a tick in the team color for each Basket already marked in this Video.
- **Transport**: current time (26 px), "/ duration", buttons −5s, −1s, play/pause, +1s, +5s, speed 0.5× / 1× / 2×.
- **MarkPanel**: Player # input (88×72 px, digits only, max 2 chars) plus two groups of three buttons (72 px tall, team tint and team border, "+N" plus a key hint).
  - Clicking marks a Basket at `video.currentTime`, highlights it in the list, and **clears Player #**.
  - Hint below: "Marks at the current time. Player # clears after each mark. Space play/pause · ← → 1s · Shift+← → 5s".
- **BasketList** (right column, ~380 px; wraps below the player on narrow windows): header "BASKETS IN VIDEO n" and a count. Columns: time (button, seeks the video), team (color square + name), +pts, player (`#7` or `—`), delete icon button. Sorted by time. Empty: "No baskets in this video yet."
- **PlayersSection**: one card per team, players sorted by number, each with an optional name input. Players are created automatically when a number is first used in a mark.

### Keyboard shortcuts (admin)

Ignore them while focus is in a text input, except Enter in the Player # box.

| Key | Action |
|---|---|
| `1` `2` `3` | Team A +1 / +2 / +3 |
| `8` `9` `0` | Team B +1 / +2 / +3 |
| Space | play / pause |
| ← / → | −1 s / +1 s |
| Shift + ← / → | −5 s / +5 s |

Because digits are also typed into Player #, a workable flow: Player # input focused → type the number → press Enter, which moves focus to the video so the next 1/2/3/8/9/0 marks. Or use the mouse. Decide during build and update the hint text.

## Data

There's no backend on the public side, so the game lives in a JSON file served with the site. Suggested shape:

```ts
type TeamId = 'A' | 'B';

interface Game {
  title: string;                // "Final Inter BBT 2026"
  teams: Record<TeamId, { name: string }>;
  players: { team: TeamId; number: number; name?: string }[];
  videos: { id: string; order: number; src: string; durationSec?: number }[];
  baskets: {
    id: string;
    videoId: string;
    timeSec: number;            // moment of the shot within its Video
    team: TeamId;
    points: 1 | 2 | 3;
    playerNumber?: number;
  }[];
}
```

- **Scoring Log**: sort Baskets by (video order, timeSec), then accumulate the running score. Derive it; never store it.
- **Playback**: load the Basket's Video, seek to `max(0, timeSec - 5)`, play.
- **Admin persistence** (suggestion): admin keeps the working copy in `localStorage` and has an "Export game.json" button; the owner commits the file to the repo. Needs no backend.
- **Video hosting**: GitHub Pages has a 100 MB per-file limit and a soft ~1 GB site limit. Ten videos at ~90 MB is close to that, so consider hosting videos elsewhere (e.g. a storage bucket, or YouTube/unlisted with the IFrame API) and putting their URLs in `src`.

## Out of scope

Per-Player stats and totals, editing a Basket in place, multiple games, and logins.
