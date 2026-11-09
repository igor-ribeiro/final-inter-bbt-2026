# Final Inter BBT 2026

Every Basket of the final, marked in the game Videos. Viewers get a Scoring Log: tap a Basket to watch it.

Terms (Game, Video, Team, Player, Basket, Scoring Log) are defined in [GLOSSARY.md](./GLOSSARY.md).

## Marking Baskets (admin)

1. `pnpm install`, then `pnpm dev`
2. Open http://localhost:5173. Localhost always shows the admin; GitHub Pages never does.
3. Pick a Video and play it to the moment the Basket is made.
4. Optionally pick the Player, then press `1` `2` `3` (Team A) or `8` `9` `0` (Team B), or click a `+N` button.

Space plays/pauses, ← → seek 1s, Shift+← → seek 5s. Add Players (number, optional name) in the Players section. To fix a mistake, delete the Basket and mark it again.

Your work saves to the browser's localStorage. "Reset to game.json" (click twice) discards it.

Preview the public view locally at http://localhost:5173/#/viewer.

## Publishing

1. Click "Export game.json" in the admin.
2. Replace `public/game.json` with the downloaded file.
3. Commit and push to `main`. GitHub Actions builds the site and deploys it to GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Adding Videos

Put `.mp4` files in `public/videos/` and list them in `public/game.json` under `videos` (`id`, `order`, `src`). The score carries over from one Video to the next in `order`. GitHub rejects files over 100 MB.

## Check

```
node --experimental-strip-types src/game.check.ts
```

Checks the running score and Player creation.
