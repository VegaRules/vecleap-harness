#!/usr/bin/env node
/** One-off product rebrand: Vecleap → Vecleap in user-facing repo text. */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'vendor', '.desktop-build', 'dist', '.vite', '.dsh-build',
])
const SKIP_PATH_PARTS = [
  '/.agents/notes/archived/',
  '\\.agents\\notes\\archived\\',
]
const EXT = new Set([
  '.ts', '.tsx', '.mts', '.mjs', '.js', '.json', '.md', '.txt', '.yml', '.yaml',
  '.webmanifest', '.mdx', '.h', '.cmd', '.py', '.jsonl', '.expected.md', '.xml',
])

const REPLACEMENTS = [
  ['Vecleap\u2019s', 'Vecleap\u2019s'],
  ["Vecleap's", "Vecleap's"],
  ['Vecleap', 'Vecleap'],
  ['vecleap-desktop', 'vecleap-desktop'],
]

function shouldSkip(abs) {
  const rel = relative(ROOT, abs).replaceAll('\\', '/')
  if (SKIP_PATH_PARTS.some(part => rel.includes(part.replaceAll('\\', '/')))) return true
  for (const part of rel.split('/')) {
    if (SKIP_DIRS.has(part)) return true
  }
  if (rel.endsWith('.tsbuildinfo')) return true
  if (rel.includes('/lib/types/') && !rel.includes('/src/')) return true
  return false
}

function walk(dir, files = []) {
  if (shouldSkip(dir)) return files
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    if (shouldSkip(abs)) continue
    const st = statSync(abs)
    if (st.isDirectory()) walk(abs, files)
    else {
      const dot = name.lastIndexOf('.')
      const ext = dot >= 0 ? name.slice(dot) : ''
      if (EXT.has(ext) || name === 'dsh' || name === 'Dockerfile') files.push(abs)
    }
  }
  return files
}

let changed = 0
for (const file of walk(ROOT)) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (!text.includes('Vecleap') && !text.includes('vecleap-desktop')) continue
  let next = text
  for (const [from, to] of REPLACEMENTS) next = next.split(from).join(to)
  if (next !== text) {
    writeFileSync(file, next)
    changed++
    console.log(relative(ROOT, file))
  }
}
console.log(`\nUpdated ${changed} files.`)
