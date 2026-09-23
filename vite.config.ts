import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, type Plugin } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const BALANCE_FILE = fileURLToPath(new URL('./src/lib/game/balance.json', import.meta.url))

// Same keys, same nesting, every leaf the same type as before (a finite
// number, or a string such as FIGHT_TIMER_FORMULA) - so the Balance Lab can
// only ever change values, never add/drop/rename a constant (that stays a
// deliberate edit to balance.json + constants.ts together).
function hasSameShape(current: unknown, incoming: unknown): boolean {
  if (typeof current === 'number') return typeof incoming === 'number' && Number.isFinite(incoming)
  if (typeof current === 'string') return typeof incoming === 'string' && incoming.length > 0
  if (typeof current !== 'object' || current === null) return false
  if (typeof incoming !== 'object' || incoming === null) return false
  const currentKeys = Object.keys(current)
  const incomingKeys = Object.keys(incoming)
  return (
    currentKeys.length === incomingKeys.length &&
    currentKeys.every((key) =>
      hasSameShape((current as Record<string, unknown>)[key], (incoming as Record<string, unknown>)[key])
    )
  )
}

// Dev-server only: GET /__balance reads balance.json, POST /__balance
// writes it (the Balance Lab at /balance.html). Writing the file triggers
// Vite's normal hot reload, so an open game tab picks up the new numbers.
function balanceFilePlugin(): Plugin {
  return {
    name: 'digiclicker-balance-file',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__balance', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const current = JSON.parse(await readFile(BALANCE_FILE, 'utf8'))
          if (req.method === 'GET') {
            res.end(JSON.stringify(current))
            return
          }
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Use GET to read or POST to save.' }))
            return
          }

          let body = ''
          for await (const chunk of req) body += chunk
          const incoming = JSON.parse(body)
          if (!hasSameShape(current, incoming)) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Not saved: every value must keep its type (number or text), and no constants can be added or removed.' }))
            return
          }
          await writeFile(BALANCE_FILE, JSON.stringify(incoming, null, 2) + '\n')
          res.end(JSON.stringify({ ok: true }))
        } catch (error) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: `Could not access balance.json: ${(error as Error).message}` }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), balanceFilePlugin()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
})
