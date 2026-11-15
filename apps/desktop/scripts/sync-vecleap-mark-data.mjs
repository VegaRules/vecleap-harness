import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const mark = join(dirname(fileURLToPath(import.meta.url)), '../../../packages/client/ui-brand-official/src/client/assets/vecleap-mark.png')
const url = `data:image/png;base64,${readFileSync(mark).toString('base64')}`
const body = `/** Product mark as a data URL for client bundles. */\nexport const VECLEAP_MARK_DATA_URL = ${JSON.stringify(url)}\n`
for (const target of [
  join(dirname(fileURLToPath(import.meta.url)), '../src/client/vecleap-mark-data.ts'),
  join(dirname(fileURLToPath(import.meta.url)), '../../../packages/client/ui-brand-official/src/client/vecleap-mark-data.ts'),
]) {
  writeFileSync(target, body)
}
console.log(`sync-vecleap-mark-data: ${url.length} chars from ${readFileSync(mark).length} bytes`)