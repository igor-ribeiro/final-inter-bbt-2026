# Viewer update — tabs, box score, desktop layout

A change to the existing **viewer** (`/`) only. The admin, the data shape and the design tokens stay as they are. Where this note and `docs/brief.md` differ, this note wins (the box score was out of scope in the brief; it is now in).

What changes:
1. The viewer gets **two tabs** under the player: **Scoring log** (what exists today) and **Box score** (new).
2. The viewer gets a **desktop layout**: video on the left, tabs on the right.

## Design files

These replace the earlier viewer files in `docs/design/`. They are mockups (template syntax, sample data), not code: match the inline styles, ignore the `{{}}` / `<sc-for>` / `<sc-if>` syntax, and read the `<script>` block for behavior.

| File | Screen |
|---|---|
| `Main.dc.html` | Viewer, phone, with tabs |
| `ViewerDesktop.dc.html` | Viewer, desktop (new) |
| `ViewerEmpty.dc.html` | Viewer, empty state, with tabs |

Both tab panels live in the same file: the blocks styled `display: {{logDisplay}}` (Scoring log) and `display: {{boxDisplay}}` (Box score).

New token: `panel` `#0E1014` (desktop right panel background). Everything else uses the existing tokens.

## 1. Tabs

- Placed directly under the NowStrip (phone) or at the top of the right panel (desktop).
- Two equal-width tabs: **SCORING LOG** (default) and **BOX SCORE**. 11 px, weight 700, uppercase, `letter-spacing: 0.14em`; height 44 px (phone) / 48 px (desktop); 1 px `line` border below.
- Active: `text` color and a 2 px bottom line (`box-shadow: inset 0 -2px 0 #E6E8EB`). Inactive: `muted`.
- Semantics: `role="tablist"` on the bar, `role="tab"` + `aria-selected` on each button, `role="tabpanel"` on each panel. ← / → between tabs when a tab has focus.
- The player keeps playing when you switch tabs. Remember the last tab per viewer in `localStorage` (wrapped in try/catch).
- The existing Scoring log (LogHeader + ScoringLog) becomes the content of the first tab, unchanged.

## 2. Box score tab

- Two equal columns: Team A left, Team B right, 1 px `line` divider between them. The panel scrolls as a whole.
- **Column header** (padding 14/12 px phone, 16 px desktop; `line` border below):
  - Team name: 10 px, 700, uppercase, `letter-spacing: 0.12em`, team color, ellipsis.
  - Team total: 24 px phone / 28 px desktop, 800, team color, tabular numbers.
- **Sub-header**: "PLAYER" left, "PTS" right; 10 px uppercase `muted`; `line` border below.
- **Player row** (padding 10 px × 12/16 px; `line-faint` border below):
  - Line 1: `#7` (12–13 px, 800) · name (`text-2`, fills the space, ellipsis; empty if the Player has no name) · points on the right (15 px phone / 16 px desktop, 800, tabular).
  - Line 2, the **scoring timeline**: the Player's Basket values in game order, space-separated, e.g. `3 2 3 1 2 2`. 11 px, `muted`, `letter-spacing: 0.08em`, tabular.
- **Sort**: points descending, then jersey number ascending.
- **"No player" row**: Baskets without a Player, grouped into one row at the bottom of each column. No number; label "No player" in `muted`; same points and timeline. This keeps each column adding up to the team total.
- Rows are not interactive.
- Empty (no Baskets): show the same "No baskets yet." message as the Scoring log.

Derivation (no new data needed):

```ts
// gameOrder = baskets sorted by (video.order, timeSec)
function boxScore(gameOrder: Basket[], team: TeamId) {
  const byPlayer = new Map<number | null, { points: number; timeline: number[] }>();
  for (const b of gameOrder) {
    if (b.team !== team) continue;
    const key = b.playerNumber ?? null;
    const row = byPlayer.get(key) ?? { points: 0, timeline: [] };
    row.points += b.points;
    row.timeline.push(b.points);
    byPlayer.set(key, row);
  }
  // sort: named/numbered players by points desc, then number asc; null ("No player") last
}
```

## 3. Phone layout (< 900 px) — `Main.dc.html`

Unchanged except for the tabs: full-height column (`h-dvh`): ScoreHeader → Player → NowStrip → **Tabs** → active panel (the only scroll area).

## 4. Desktop layout (≥ 900 px) — `ViewerDesktop.dc.html`

Full-height (`h-screen`), no page scroll.

- **Header** (one line, padding 16 × 32 px, `line` border below), three columns:
  - Left: "FINAL · INTER BBT 2026" (11 px, `muted`, spaced caps).
  - Center: `TEAM A NAME   31 – 30   TEAM B NAME`. Names 14 px / 700 in team colors; score 32 px / 800, each number in its team color, the dash in `dash`.
  - Right: "FINAL SCORE" (11 px, `muted`).
- **Body**: a row filling the rest of the height.
  - **Left** (flexible; padding 24 × 32 px; scrolls only if the window is very short):
    - Player: full width, 16:9, radius 6 px, `object-contain` (vertical videos pillarboxed). Same overlay chips as phone, plus play/pause, time and fullscreen in the bottom bar.
    - **NowStrip card** below it (`surface`, 1 px `line` border, radius 6, padding 14 × 16, gap 16): **← Prev** button · "NOW" · "PIVÔS +3" (16 px / 800, team color) · player (15 px `text-2`, ellipsis) · score after (18 px / 800) · position "19 of 22" (12 px `muted`) · **Next →** button. Buttons: 40 px tall, 1 px `line-strong` border, radius 4.
    - Prev / Next select the previous / next Basket in game order and play it (same as tapping its row). Also bound to ← / → when focus isn't in a field or on the tabs. Disable at the ends.
  - **Right**: fixed 460 px panel, `panel` background, 1 px `line` left border, full height. Contains the Tabs and the active panel; only the panel content scrolls. Log grid is `1fr 84px 1fr` with 16 px side padding; row text 13 px, score 14 px.
- Selecting a row (or Prev/Next) scrolls that row into view in the log if it is off-screen.

## Breakpoint

Switch layouts at **900 px** viewport width (`min-[900px]:` or a custom `desk` screen in Tailwind). Selection, current tab and playback state are shared, so resizing across the breakpoint keeps the same Basket playing.

## Done when

- Phone: tabs switch between the existing log and the new box score; the player never stops or resizes.
- Box score columns add up to the header score; timelines match the log order; "No player" appears only when needed.
- Desktop at 1280–1440 px wide matches `ViewerDesktop.dc.html`; only the right panel scrolls.
- Prev / Next (buttons and arrow keys) walk through every Basket, across Videos.
- `npm run build` passes with no type errors.
