#!/usr/bin/env node
// Makes a `pnpm deploy` of @vecleap/harness-cloud self-contained: the
// workspace links some vendored packages (link: overrides), which a deploy
// keeps as symlinks into the source checkout. Each symlink that resolves
// outside the install is replaced by a copy of its target.
import { cpSync, lstatSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const root = resolve(process.argv[2] ?? '.')
let replaced = 0
const inside = (path) => path === root || path.startsWith(root + sep)

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isSymbolicLink()) {
      let target
      try { target = realpathSync(path) } catch { continue }
      if (inside(target)) continue
      rmSync(path)
      // The linked package's own node_modules points back into the source
      // checkout; its dependencies resolve from the install's store instead.
      cpSync(target, path, {
        recursive: true,
        filter: (src) => {
          const parts = relative(target, src).split(sep)
          return !parts.includes('node_modules') && !parts.includes('.git')
        },
      })
      replaced++
    } else if (entry.isDirectory()) {
      walk(path)
    }
  }
}
walk(root)
process.stdout.write(`materialized ${replaced} external link(s) under ${relative(process.cwd(), root) || '.'}\n`)
