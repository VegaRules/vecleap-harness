#!/usr/bin/env node
/**
 * Quick Hub cloud-session check (no Desktop rebuild). Reads the same
 * credentials Desktop uses under %USERPROFILE%\.dsh\.credentials.yaml.
 *
 * Usage: node scripts/diagnose-hub-cloud-sessions.mjs
 *        DSH_HOME=C:\path\to\.dsh node scripts/diagnose-hub-cloud-sessions.mjs
 */
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
const home = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
const credPath = join(home, '.credentials.yaml')

function normalizeBaseURL(base) {
  return base.replace(/\/+$/, '')
}

async function main() {
  console.log(`DSH_HOME=${home}`)
  let raw
  try {
    raw = await readFile(credPath, 'utf8')
  } catch (error) {
    console.error(`Cannot read ${credPath}: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }

  const hubUrlMatch = raw.match(/^\s+hubBaseURL:\s*(\S+)\s*$/m)
  const tokenMatch = raw.match(/^\s+access_token:\s*(\S+)\s*$/m)
  const emailMatch = raw.match(/^\s+email:\s*(\S+)\s*$/m)
  if (hubUrlMatch === null || tokenMatch === null) {
    console.error('No vecleap-hub/session in credentials — Desktop is not logged in to Hub.')
    process.exit(1)
  }
  const hubBaseURL = hubUrlMatch[1]
  const token = tokenMatch[1]
  const email = emailMatch?.[1] ?? '(unknown)'

  const hub = normalizeBaseURL(hubBaseURL)
  console.log(`Hub user: ${email}`)
  console.log(`Hub origin: ${hub}`)

  const url = `${hub}/api/sync/sessions?limit=50`
  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, 20_000)
  let response
  try {
    response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
  } catch (error) {
    console.error(`GET ${url} failed: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  } finally {
    clearTimeout(timer)
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error(`GET ${url} => ${response.status}`, body)
    process.exit(1)
  }

  const sessions = Array.isArray(body.sessions) ? body.sessions : []
  console.log(`OK: ${sessions.length} cloud session(s)`)
  for (const row of sessions.slice(0, 10)) {
    const title = row?.title ?? '(no title)'
    const id = row?.session_id ?? '?'
    console.log(`  - ${title}  [${id}]`)
  }
  if (sessions.length === 0) {
    console.log('(Hub returned an empty list for this account.)')
  } else {
    console.log('\nIf Desktop cloud panel is still empty, the installed app is not calling Hub correctly — use dev:desktop or reinstall a build that includes the listChatSessions fix.')
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})