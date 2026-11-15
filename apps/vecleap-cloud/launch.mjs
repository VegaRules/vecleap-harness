#!/usr/bin/env node
// Runs dsh for one VecLeap Hub Agent task inside Hub's sandbox.
//
// The sandbox has no network of its own. Hub binds a Unix socket that reaches
// only Hub (VECLEAP_HUB_SOCKET); this launcher forwards a loopback port to it,
// points VECLEAP_HUB_URL there, and then runs dsh with the given arguments.
// stdin, stdout and stderr are dsh's; the exit status is dsh's.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const socketPath = process.env.VECLEAP_HUB_SOCKET
if (!socketPath) {
  process.stderr.write('vecleap-cloud: VECLEAP_HUB_SOCKET is required\n')
  process.exit(2)
}
// In a `pnpm deploy` of this package dsh is a dependency; in the source
// repository it is the sibling apps/cli.
const here = dirname(fileURLToPath(import.meta.url))
const dshBin = process.env.DSH_BIN || [
  join(here, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
  join(here, '..', 'cli', 'lib', 'bin.js'),
].find((path) => existsSync(path))

const forwarder = net.createServer((client) => {
  const upstream = net.connect(socketPath)
  client.pipe(upstream)
  upstream.pipe(client)
  client.on('error', () => upstream.destroy())
  upstream.on('error', () => client.destroy())
})

forwarder.listen(0, '127.0.0.1', () => {
  const { port } = forwarder.address()
  const child = spawn(process.execPath, [dshBin, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, VECLEAP_HUB_URL: `http://127.0.0.1:${port}` },
  })
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(signal, () => child.kill(signal))
  child.on('exit', (code, signal) => {
    forwarder.close()
    process.exit(code ?? (signal ? 128 + 15 : 1))
  })
})
forwarder.on('error', (error) => {
  process.stderr.write(`vecleap-cloud: ${error.message}\n`)
  process.exit(2)
})
