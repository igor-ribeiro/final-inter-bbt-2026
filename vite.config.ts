import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFile } from 'node:fs/promises'

// Dev-only: the admin's "Save" button POSTs the game here and it lands in public/game.json.
const saveGame: Plugin = {
  name: 'save-game',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/api/save-game', async (req, res) => {
      if (req.method !== 'POST') return void ((res.statusCode = 405), res.end())
      let body = ''
      for await (const chunk of req) body += chunk
      try {
        const game = JSON.parse(body)
        if (!game?.teams || !Array.isArray(game.videos) || !Array.isArray(game.baskets) || !Array.isArray(game.players))
          throw new Error('not a Game')
        await writeFile('public/game.json', JSON.stringify(game, null, 2) + '\n')
        res.end('ok')
      } catch (e) {
        res.statusCode = 400
        res.end(String(e))
      }
    })
  },
}

// Relative base + hash routing: works at any GitHub Pages path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), saveGame],
  // Saving game.json must not reload the admin mid-video.
  server: { watch: { ignored: ['**/public/game.json'] } },
})
