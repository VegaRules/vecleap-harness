/** One-off typert emit for @deepseek-ai/dsh-api-vecleap-hub-controller when full host tsdown OOMs. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WorkspaceTypertGenerator } from '@deepseek-ai/dsh-typert-generator'

const root = join(import.meta.dirname, '..')
const pkg = '@deepseek-ai/dsh-api-vecleap-hub-controller'
const gen = new WorkspaceTypertGenerator(root)
const artifacts = gen.generate([pkg], ['host'])
if (artifacts.length === 0) {
  console.error(`typert: no artifacts for ${pkg}`)
  process.exit(1)
}
for (const artifact of artifacts) {
  const output = join(root, artifact.packageRoot, 'lib')
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, `typert.${artifact.face}.js`), artifact.js)
  writeFileSync(join(output, `typert.${artifact.face}.d.ts`), artifact.dts)
  if (artifact.remote !== undefined) {
    writeFileSync(join(output, 'typert.remote-client.js'), artifact.remote.js)
    writeFileSync(join(output, 'typert.remote-client.d.ts'), artifact.remote.dts)
    writeFileSync(join(output, 'typert.remote-client.d.ts.map'), artifact.remote.dtsMap)
  }
  console.log(`typert: wrote ${artifact.package} (${artifact.face})`)
}
