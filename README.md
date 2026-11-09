# Final Inter BBT 2026

Every Basket of the final, marked in the game Videos. Viewers get a Scoring Log: click a Basket to watch it.

Terms (Game, Video, Team, Player, Basket, Scoring Log) are defined in [GLOSSARY.md](./GLOSSARY.md).

## Marking Baskets (admin)

1. `pnpm install`, then `pnpm dev`
2. Open http://localhost:5173. Localhost always shows the admin view.
3. Pick a Video and play it to the moment the Basket is made.
4. Optionally type the Player's number, then click a button like `Home +2`.

Every change saves straight to `src/game.json`. Typing a new number creates that Player; give Players names in the Players section. Rename Teams at the top. To fix a mistake, delete the Basket and mark it again.

Preview the public view locally at http://localhost:5173/?viewer.

## Publishing

Commit `src/game.json` and push to `main`. GitHub Actions builds the site and deploys it to GitHub Pages.

## Adding Videos

Drop `.mp4` files into `public/videos/`. Videos play in filename order (`01 …`, `02 …`), and the score carries over from one to the next. GitHub rejects files over 100 MB.

## Check

```
node --experimental-strip-types src/game.check.ts
```

Checks the running score and Player creation.
