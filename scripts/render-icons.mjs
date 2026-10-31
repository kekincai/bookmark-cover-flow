import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Rasterizes docs/assets/icon-source.svg into the extension's PNG icon sizes.
const source = await readFile(resolve('docs/assets/icon-source.svg'), 'utf8')
const sizes = [16, 32, 48, 128]
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  for (const size of sizes) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
    )
    await page.screenshot({
      path: resolve(`public/icons/icon-${size}.png`),
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    })
  }
  console.log(`Rendered ${sizes.map((size) => `${size}px`).join(', ')} icons.`)
} finally {
  await browser.close()
}
