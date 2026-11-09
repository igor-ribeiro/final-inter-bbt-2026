# Final Inter BBT 2026: UI design brief

## What it is

A small website for one amateur basketball game: the final between "Pivôs do Churrasco" and "Inimigos da Cesta". The game was filmed on phones as about 10 consecutive videos. Every made shot (a "Basket") is marked at the moment it happens in a video. Viewers see the game's scoring as a list and tap any Basket to watch it.

## Terms

- **Game**: the one match, between exactly two Teams.
- **Video**: one recorded part of the Game. Videos play in order, and the score carries over from one to the next.
- **Team**: one of the two sides. The admin can rename it.
- **Player**: a member of a Team, identified by jersey number. Their name is optional.
- **Basket**: a made shot worth 1, 2, or 3 points. It belongs to a Team, optionally has a Player, and is marked at one moment in a Video.
- **Scoring Log**: every Basket in Game order, with the running score after each one.

## Screen 1: Viewer (public; most people see only this)

- Mobile-first. People open it from a shared link, mostly on phones.
- A video player stays pinned at the top while the Scoring Log scrolls underneath it.
- The Scoring Log has three columns. Team A's Baskets are on the left, the running score is in the center, and Team B's are on the right:

```
#7 João - Pivôs +3 | 24–21 |
                   | 24–24 | Inimigos +3 - #3 Marcos
                   | 24–26 | Inimigos +2
     Pivôs +1      | 25–26 |
```

- Tapping a row plays that Basket in the pinned player, starting 5 seconds before the shot.
- A Player can be missing (no number). A Player's name can be missing (number only, e.g. "#12").
- Header: the two Team names. Nice to have: the final score.
- Empty state: "No baskets yet."

## Screen 2: Admin (only on the owner's laptop; desktop-only is fine)

- Team names: two text inputs that save as you type.
- A dropdown to pick a Video, showing how many Baskets each Video has.
- A large video player. Below it, a "Player #" input plus six quick buttons: [Team A +1] [+2] [+3] [Team B +1] [+2] [+3]. One click marks a Basket at the video's current time.
- Next to the video, the Baskets in this Video: the time (click to jump there), Team, points and Player, plus a delete button.
- A Players section: one list per Team, sorted by number, with an optional name input for each Player.
- Speed matters here. The owner marks dozens of Baskets while scrubbing through video.

## Visual direction (current)

- Dark theme and monospace font throughout.
- One color per Team (currently blue and red), used consistently in the buttons and in the log columns.
- Minimal, scoreboard and terminal feel. No images or logos.

## Constraints

- Static website (GitHub Pages) built with React and Tailwind CSS. No logins and no backend on the public side.
- Videos are phone recordings: 16:9 or vertical, up to about 90 MB each.
- Out of scope for now: per-Player stats and totals (a box score), editing a Basket in place, and multiple games.
