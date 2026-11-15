/** Regenerate NSIS installer hero art (VecLeap mark + wordmark only). */

import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const assets = join(here, '../installer/assets')
const markPath = join(here, '../../../packages/client/ui-brand-official/src/client/assets/vecleap-mark.png')

async function renderBrand(width, height, dark) {
  const markSize = Math.round(height * 0.22)
  const mark = await sharp(markPath).resize(markSize, markSize).png().toBuffer()
  const bg = dark ? '#151517' : '#FAFAF8'
  const textColor = dark ? '#FFFFFF' : '#252723'
  const gap = Math.round(markSize * 0.25)
  const fontSize = Math.round(markSize * 0.85)
  const textWidth = Math.round(fontSize * 'VecLeap'.length * 0.58)
  const total = markSize + gap + textWidth
  const x0 = Math.round((width - total) / 2)
  const y0 = Math.round((height - markSize) / 2)
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="${x0 + markSize + gap}" y="${y0 + markSize * 0.78}"
    font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    font-size="${fontSize}" font-weight="600" fill="${textColor}">VecLeap</text>
</svg>`
  const base = await sharp(Buffer.from(svg)).png().toBuffer()
  return sharp(base).composite([{ input: mark, left: x0, top: y0 }]).png().toBuffer()
}

for (const [name, width, height, dark] of [
  ['brand.png', 600, 196, false],
  ['brand-2x.png', 1200, 392, false],
  ['brand-dark.png', 600, 196, true],
  ['brand-dark-2x.png', 1200, 392, true],
]) {
  writeFileSync(join(assets, name), await renderBrand(width, height, dark))
  console.log(`render-installer-brand: ${name}`)
}