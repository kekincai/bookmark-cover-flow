import { expect, test } from '@playwright/test'

const cases = [
  {
    locale: 'zh-CN',
    lang: 'zh-CN',
    title: '书签 Cover Flow',
    open: '偏好设置',
    settings: '设置',
    appearance: '外观',
    background: '背景',
    privacy: '隐私',
    done: '完成',
    upload: '选择图片或视频',
    error: 'Chrome 无法解码此文件',
    search: '搜索书签',
    library: '资料库',
    all: '全部书签',
    count: '19 个书签',
    matches: '2 个匹配“figma”',
    noResults: '没有找到“zzzz”',
    fullscreen: '全屏 Cover Flow',
    exit: '退出全屏',
  },
  {
    locale: 'zh-TW',
    lang: 'zh-TW',
    title: '書籤 Cover Flow',
    open: '偏好設定',
    settings: '設定',
    appearance: '外觀',
    background: '背景',
    privacy: '隱私權',
    done: '完成',
    upload: '選擇圖片或影片',
    error: 'Chrome 無法解碼此檔案',
    search: '搜尋書籤',
    library: '資料庫',
    all: '所有書籤',
    count: '19 個書籤',
    matches: '2 個符合「figma」的結果',
    noResults: '找不到「zzzz」',
    fullscreen: '全螢幕 Cover Flow',
    exit: '結束全螢幕',
  },
  {
    locale: 'ja-JP',
    lang: 'ja',
    title: 'Bookmark Cover Flow',
    open: '設定を開く',
    settings: '設定',
    appearance: '外観',
    background: '背景',
    privacy: 'プライバシー',
    done: '完了',
    upload: '写真・動画を選択',
    error: 'Chrome でこのファイルを読み込めません',
    search: 'ブックマークを検索',
    library: 'ライブラリ',
    all: 'すべてのブックマーク',
    count: '19 件のブックマーク',
    matches: '「figma」に一致する項目 2 件',
    noResults: '「zzzz」に一致する項目はありません',
    fullscreen: 'フルスクリーン Cover Flow',
    exit: 'フルスクリーンを解除',
  },
  {
    locale: 'en-US',
    lang: 'en',
    title: 'Bookmark Cover Flow',
    open: 'Open settings',
    settings: 'Settings',
    appearance: 'Appearance',
    background: 'Background',
    privacy: 'Privacy',
    done: 'Done',
    upload: 'Choose photo or video',
    error: 'Chrome cannot decode',
    search: 'Search bookmarks',
    library: 'Library',
    all: 'All Bookmarks',
    count: '19 bookmarks',
    matches: '2 matches for “figma”',
    noResults: 'No results for “zzzz”',
    fullscreen: 'Full-screen Cover Flow',
    exit: 'Exit full screen',
  },
]
// Unsupported languages fall back to English.
const all = [...cases, { ...cases[3]!, locale: 'fr-FR' }]

for (const sample of all)
  test(`${sample.locale} localizes the shell, settings, accessible names and errors`, async ({
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
      await expect(page).toHaveTitle(sample.title)
      await expect(page.locator('.title-bar__title')).toHaveText(sample.all)
      await expect(page.locator('.title-bar__detail')).toHaveText(sample.count)
      await expect(page.locator('.sidebar__heading').first()).toHaveText(sample.library)
      // Bookmark titles are never translated.
      await expect(page.locator('.stage .bookmark-meta__title')).toHaveText('Design Notes')

      const search = page.getByRole('searchbox', { name: sample.search })
      await search.fill('figma')
      await expect(page.locator('.title-bar__detail')).toHaveText(sample.matches)
      await search.fill('zzzz')
      await expect(page.locator('.stage-status')).toContainText(sample.noResults)
      await search.fill('')

      await page.getByRole('button', { name: sample.fullscreen }).click()
      await expect(page.getByRole('button', { name: sample.exit })).toBeFocused()
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: sample.open, exact: true }).click()
      const dialog = page.getByRole('dialog', { name: sample.settings, exact: true })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('tab', { name: sample.appearance, exact: true })).toBeFocused()
      await expect(dialog.getByRole('tab', { name: sample.privacy, exact: true })).toBeVisible()
      if (process.env.SETTINGS_SCREENSHOT_DIR && sample.locale === 'zh-CN') {
        await page.screenshot({
          path: `${process.env.SETTINGS_SCREENSHOT_DIR}/appearance-zh-CN.png`,
        })
      }
      await dialog.getByRole('tab', { name: sample.background, exact: true }).click()
      await page.getByLabel(sample.upload, { exact: true }).setInputFiles({
        name: 'broken.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('invalid video fixture'),
      })
      await expect(dialog.getByRole('alert')).toContainText(sample.error)
      if (sample.lang !== 'en') {
        for (const name of ['Appearance', 'Background', 'Privacy'])
          await expect(dialog.getByRole('tab', { name, exact: true })).toHaveCount(0)
        await dialog.getByRole('tab', { name: sample.appearance, exact: true }).click()
        expect(await dialog.innerText()).not.toMatch(
          /\b(Settings|Appearance|Background|Privacy|Done|Loading|Sort bookmarks|Cover angle)\b/,
        )
      }
      await expect.poll(async () => Math.round((await dialog.boundingBox())?.width ?? 0)).toBe(760)
      await dialog.getByRole('button', { name: sample.done, exact: true }).click()
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
