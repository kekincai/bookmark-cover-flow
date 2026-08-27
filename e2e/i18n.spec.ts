import { expect, test } from '@playwright/test'

const cases = [
  {
    locale: 'zh-CN',
    lang: 'zh-CN',
    open: '打开设置',
    settings: '设置',
    appearance: '外观',
    background: '壁纸',
    upload: '上传本地图片或视频',
    error: 'Chrome 无法解码此文件',
    search: '搜索书签',
    close: '关闭设置',
  },
  {
    locale: 'zh-TW',
    lang: 'zh-TW',
    open: '開啟設定',
    settings: '設定',
    appearance: '外觀',
    background: '桌布',
    upload: '上傳本機圖片或影片',
    error: 'Chrome 無法解碼此檔案',
    search: '搜尋書籤',
    close: '關閉設定',
  },
  {
    locale: 'ja-JP',
    lang: 'ja',
    open: '設定を開く',
    settings: '設定',
    appearance: '外観',
    background: '壁紙',
    upload: '写真・動画を選択',
    error: 'Chrome でこのファイルを読み込めません',
    search: 'ブックマークを検索',
    close: '設定を閉じる',
  },
  {
    locale: 'en-US',
    lang: 'en',
    open: 'View options',
    settings: 'Settings',
    appearance: 'Appearance',
    background: 'Background',
    upload: 'Choose photo or video',
    error: 'Chrome cannot decode',
    search: 'Search bookmarks',
    close: 'Close settings',
  },
  {
    locale: 'fr-FR',
    lang: 'en',
    open: 'View options',
    settings: 'Settings',
    appearance: 'Appearance',
    background: 'Background',
    upload: 'Choose photo or video',
    error: 'Chrome cannot decode',
    search: 'Search bookmarks',
    close: 'Close settings',
  },
]

for (const sample of cases)
  test(`${sample.locale} automatically localizes settings, accessible names and errors`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      locale: sample.locale,
      viewport: { width: 1440, height: 900 },
    })
    try {
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(baseURL!)
      await expect(page.locator('html')).toHaveAttribute('lang', sample.lang)
      await expect(page.getByRole('searchbox', { name: sample.search })).toBeVisible()
      await page.getByRole('button', { name: sample.open, exact: true }).click()
      const dialog = page.getByRole('dialog', { name: sample.settings, exact: true })
      await expect(dialog).toBeVisible()
      await expect
        .poll(() =>
          dialog.evaluate((element) =>
            Math.abs(element.getBoundingClientRect().right - (window.innerWidth - 20)),
          ),
        )
        .toBeLessThan(0.1)
      await expect(page.getByRole('button', { name: sample.close, exact: true })).toBeFocused()
      await expect(dialog.locator('.settings-brand')).toHaveCount(0)
      await expect(dialog.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal')
      await expect(dialog.locator('.settings-group')).toHaveCount(4)
      if (process.env.SETTINGS_SCREENSHOT_DIR && sample.locale === 'zh-CN') {
        await page.screenshot({
          path: `${process.env.SETTINGS_SCREENSHOT_DIR}/appearance-zh-CN.png`,
        })
      }
      await page.getByRole('tab', { name: sample.background, exact: true }).click()
      if (process.env.SETTINGS_SCREENSHOT_DIR && sample.locale !== 'fr-FR') {
        await page.screenshot({
          path: `${process.env.SETTINGS_SCREENSHOT_DIR}/background-${sample.locale}.png`,
        })
      }
      await page.getByLabel(sample.upload, { exact: true }).setInputFiles({
        name: 'broken.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('invalid video fixture'),
      })
      await expect(page.getByRole('alert')).toContainText(sample.error)
      if (sample.lang !== 'en')
        expect(await dialog.innerText()).not.toMatch(
          /\b(Settings|Appearance|Background|Image treatment|Loading)\b/,
        )
      const bounds = await dialog.boundingBox()
      expect(bounds?.width).toBeCloseTo(440, 3)
      await page.getByRole('button', { name: sample.close, exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect(page.getByRole('button', { name: sample.open, exact: true })).toBeFocused()
      await page.getByRole('button', { name: sample.open, exact: true }).click()
      await expect(dialog).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      expect(errors).toEqual([])
    } finally {
      await context.close()
    }
  })
