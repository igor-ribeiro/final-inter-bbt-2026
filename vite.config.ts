import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFile, readdir, writeFile } from 'node:fs/promises'

// Dev-only API for the admin view: list Videos, read/save src/game.json.
const adminApi: Plugin = {
  name: 'admin-api',
  configureServer(server) {
    server.middlewares.use('/api/videos', async (_req, res) => {
      const files = (await readdir('public/videos')).filter((f) => f.endsWith('.mp4'))
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(files))
    })
    server.middlewares.use('/api/game', async (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      if (req.method === 'GET') return void res.end(await readFile('src/game.json'))
      if (req.method !== 'POST') return void (res.statusCode = 405, res.end())
      let body = ''
      for await (const chunk of req) body += chunk
      try {
        const game = JSON.parse(body)
        if (!Array.isArray(game.teams) || !Array.isArray(game.players) || !Array.isArray(game.baskets))
          throw new Error('bad game shape')
        await writeFile('src/game.json', JSON.stringify(game, null, 2) + '\n')
        res.end('ok')
      } catch (e) {
        res.statusCode = 400
        res.end(String(e))
      }
    })
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), adminApi],
  // Saving game.json must not reload the page mid-video.
  server: { watch: { ignored: ['**/src/game.json'] } },
})
