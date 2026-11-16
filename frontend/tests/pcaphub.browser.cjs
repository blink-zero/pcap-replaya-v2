/* Browser regression test against a built frontend. All API traffic is mocked; no replay.
 * Run preview on :4178, then NODE_PATH=<external playwright install>/node_modules node tests/pcaphub.browser.cjs
 * Optional PCAPHUB_TEST_URL overrides the preview URL. No application dependencies added.
 */
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const base = process.env.PCAPHUB_TEST_URL || 'http://127.0.0.1:4178'
const capture = { id: '419d359d-bb5b-410c-b1e7-8ffe6696cd64', title: 'DNS training capture', username: 'tester', description: 'A short description.\n\nFull preview text with <script>not executable</script>.', file_size: 4000, packet_count: 42, duration_ms: 1400, created_at: '2026-04-12T00:00:00Z', sha256: 'a'.repeat(64), top_protocols: ['DNS', 'UDP'], tags: ['dns', 'training'] }
const file = { id: 'local-capture', filename: 'training.pcap', original_filename: 'training.pcap', file_size: 4000, file_format: 'pcap', packet_count: 42, duration: 1.4, uploaded_at: '2026-04-12T00:00:00Z', updated_at: '2026-04-12T00:00:00Z' }
;(async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const searches = [], posts = [], errors = []
    let searchError = false, importError = false, configured = true, importDelay = 0
    page.on('pageerror', e => errors.push(e.message))
    await page.route('**/socket.io/**', route => route.abort())
    await page.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
      if (request.method() === 'POST') posts.push(path)
      if (path === '/api/pcaphub/status') return json({ import_configured: configured, auth_mode: 'x-api-key', max_download_bytes: 10000, timeout_seconds: 60 })
      if (path === '/api/pcaphub/search') {
        searches.push(Object.fromEntries(url.searchParams))
        if (searchError) return json({ detail: 'PCAPHub rate limit reached. Try again later.' }, 503)
        const q = url.searchParams.get('q'), number = Number(url.searchParams.get('page') || 1)
        if (q === 'slow') await new Promise(resolve => setTimeout(resolve, 900))
        return json({ data: q === 'empty' ? [] : [{ ...capture, title: q === 'slow' ? 'Stale capture' : capture.title }], meta: { total: q === 'empty' ? 0 : 48, page: number, limit: 24, total_pages: q === 'empty' ? 0 : 2 } })
      }
      if (path.endsWith('/import')) {
        await new Promise(resolve => setTimeout(resolve, importDelay))
        return importError ? json({ detail: 'Capture checksum mismatch.' }, 422) : json(file, 201)
      }
      if (path === '/api/files') return json({ files: [file] })
      if (path.endsWith('/analysis')) return json({ file_id: file.id, filename: file.filename, file_size: 4000, file_format: 'pcap', packet_count: 42, analyzed_packets: 42, duration: 1.4, start_time: null, end_time: null, data_rate: 2000, protocols: [], top_talkers: [], packet_size_distribution: {}, analysis_limited: false })
      if (path === '/api/interfaces') return json({ interfaces: [] })
      if (path === '/api/profiles') return json({ profiles: [] })
      if (path === '/api/replay/status') return json({ status: 'idle', packets_sent: 0, bytes_sent: 0, total_packets: 0, progress_percent: 0, elapsed_time: 0, loop_count: 0 })
      return json({ status: 'ok', version: 'test' })
    })
    const heading = () => page.getByRole('heading', { name: capture.title, exact: true })
    const search = () => page.getByRole('searchbox', { name: 'Search captures' })
    await page.goto(`${base}/pcaphub`)
    await heading().waitFor()
    await page.getByText('Preview details', { exact: false }).click()
    assert.equal(await page.locator('details[open]').count(), 1)
    assert.equal(await page.locator('details[open]').getByText(capture.sha256).count(), 1)
    const before = searches.length
    await search().pressSequentially('dns', { delay: 70 })
    await page.waitForURL('**/pcaphub?q=dns')
    await heading().waitFor()
    assert.equal(searches.length, before + 1, 'typing is debounced into one request')
    assert(await search().evaluate(el => el === document.activeElement), 'search retains focus after debounce')
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.waitForURL(url => url.searchParams.get('page') === '2')
    await heading().waitFor()
    await page.getByRole('button', { name: 'DNS', exact: true }).click()
    await page.waitForURL(url => url.searchParams.get('protocol') === 'DNS')
    assert(!page.url().includes('page='), 'filter resets page')
    await page.reload()
    await heading().waitFor()
    assert.equal(await search().inputValue(), 'dns')
    assert.equal(await page.getByRole('textbox', { name: 'Protocol', exact: true }).inputValue(), 'DNS')
    await page.getByRole('button', { name: '#training', exact: true }).click()
    await page.waitForURL(url => url.searchParams.get('tag') === 'training')
    await heading().waitFor()
    assert.equal(searches.at(-1).tag, 'training')
    await page.goBack()
    await heading().waitFor()
    assert.equal(await page.getByRole('textbox', { name: 'Tag', exact: true }).inputValue(), '')
    await search().fill('slow')
    await page.waitForURL(url => url.searchParams.get('q') === 'slow')
    await search().fill('fresh')
    await page.waitForURL(url => url.searchParams.get('q') === 'fresh')
    await page.waitForTimeout(1100)
    await heading().waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Stale capture' }).count(), 0)
    await search().fill('empty')
    await page.getByText('No captures found', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Browse all captures' }).click()
    await heading().waitFor()
    searchError = true
    await search().fill('error')
    await page.getByRole('button', { name: 'Retry search' }).waitFor()
    searchError = false
    await page.getByRole('button', { name: 'Retry search' }).click()
    await heading().waitFor()
    assert.equal(await search().inputValue(), 'error')
    await page.setViewportSize({ width: 390, height: 844 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile layout has no horizontal overflow')
    await page.screenshot({ path: '/tmp/pcaphub-mobile.png', fullPage: true })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.screenshot({ path: '/tmp/pcaphub-desktop.png', fullPage: true })
    importError = true
    await page.getByRole('button', { name: `Import and replay ${capture.title}`, exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Capture checksum mismatch.' }).waitFor()
    assert(new URL(page.url()).pathname === '/pcaphub', 'failure must not navigate')
    importError = false
    importDelay = 350
    await page.getByRole('button', { name: `Import ${capture.title}`, exact: true }).click()
    assert(await page.getByRole('button', { name: `Import and replay ${capture.title}` }).isDisabled())
    await page.getByRole('button', { name: `Open replay for ${capture.title}` }).waitFor()
    assert(new URL(page.url()).pathname === '/pcaphub', 'Import stays on catalogue')
    const imports = posts.length
    await page.getByRole('button', { name: `Open replay for ${capture.title}` }).click()
    await page.waitForURL('**/replay')
    assert.equal(await page.evaluate(() => history.state.usr.importedFile.id), file.id)
    assert.equal(posts.length, imports, 'Open Replay reuses the saved file')
    await page.getByText('training.pcap', { exact: true }).first().waitFor({ timeout: 5000 }).catch(async error => { console.log('replay diagnostics', errors, await page.locator('body').innerText()); throw error })
    await page.goto(`${base}/pcaphub`)
    await heading().waitFor()
    await page.getByRole('button', { name: `Import and replay ${capture.title}` }).click()
    await page.waitForURL('**/replay')
    assert.equal(await page.evaluate(() => history.state.usr.importedFile.id), file.id)
    configured = false
    await page.goto(`${base}/pcaphub`)
    await heading().waitFor()
    assert(await page.getByRole('button', { name: `Import ${capture.title}`, exact: true }).isDisabled())
    assert(await page.getByRole('button', { name: `Import and replay ${capture.title}`, exact: true }).isDisabled())
    assert(posts.every(path => path.endsWith('/import')), 'never request replay start or any other mutation')
    assert.deepEqual(errors, [], 'no browser JS errors')
    console.log('PASS: debounce, URL persistence/back, exact filters, pagination/reset, stale response, preview, empty/error/retry, mobile overflow, Import, Import & Replay, saved-file reuse, failure/no navigation, browse-only, no replay requests, no JS errors')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
