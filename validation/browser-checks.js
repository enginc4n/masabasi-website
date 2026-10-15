// Execute this function with Playwright MCP browser_run_code_unsafe(filename).
async (page) => {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const originalPage = page;
  const testContext = await page.context().browser().newContext();
  page = await testContext.newPage();
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('response', (response) => { if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`); });
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.addInitScript(() => {
    window.__qa = { motion: [], shifts: [], shiftSources: [] };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      window.__qa.motion.push({
        kind: this.dataset.entrance || this.id || this.className,
        delay: options.delay,
        duration: options.duration,
        observedAt: performance.now(),
        scale: frames[0].scale,
      });
      return animate.call(this, frames, options);
    };
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) {
          window.__qa.shifts.push(entry.value);
          window.__qa.shiftSources.push({ time: entry.startTime, value: entry.value, sources: entry.sources.map((source) => ({ element: source.node?.outerHTML?.slice(0,160), before: source.previousRect.toJSON(), after: source.currentRect.toJSON() })) });
        }
      });
    }).observe({ type: 'layout-shift', buffered: true });
  });

  const report = { viewports: [], interactions: [], motion: null, fallback: null };
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://localhost:8765/');
    await page.waitForTimeout(2100);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    await page.screenshot({ path: `validation/redesign-final-${width}.png` });
    const heightOfPage = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < heightOfPage; y += height * .7) {
      await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1100);
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      containerWidth: document.querySelector('.hero').getBoundingClientRect().width,
      containerAligned: ['.site-header', '.hero', '.benefits', '.events', '.about', '.membership', '.community', '.site-footer'].every((selector) => Math.abs(document.querySelector(selector).getBoundingClientRect().left - document.querySelector('.hero').getBoundingClientRect().left) < 1),
      headingContained: document.querySelector('.hero h1 span').getBoundingClientRect().right <= document.querySelector('.hero h1').getBoundingClientRect().right + 1,
      heroImageInset: document.querySelector('.hero-image').getBoundingClientRect().right < innerWidth,
      heroColumns: getComputedStyle(document.querySelector('.hero')).gridTemplateColumns,
      benefitColumns: getComputedStyle(document.querySelector('.benefits')).gridTemplateColumns,
      eventColumns: getComputedStyle(document.querySelector('.event-grid')).gridTemplateColumns,
      imagesLoaded: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
      hiddenReveals: [...document.querySelectorAll('[data-entrance], [data-reveal]')].filter((element) => getComputedStyle(element).opacity !== '1').length,
      reveals: window.__qa.motion.length,
      targets: document.querySelectorAll('[data-entrance], [data-reveal]').length,
      layoutShift: window.__qa.shifts.reduce((sum, value) => sum + value, 0),
    }));
    assert(metrics.containerAligned, `Misaligned containers at ${width}`);
    assert(metrics.containerWidth <= 1312, `Unbounded content at ${width}`);
    assert(metrics.headingContained, `Hero heading overflow at ${width}`);
    assert(metrics.heroImageInset, `Hero image at viewport edge at ${width}`);
    assert(metrics.imagesLoaded, `Missing image at ${width}`);
    assert(metrics.hiddenReveals === 0, `Invisible reveal at ${width}`);
    assert(metrics.reveals === metrics.targets, `Untriggered reveal at ${width}`);
    assert(metrics.layoutShift < .01, `Layout shift at ${width}: ${JSON.stringify(await page.evaluate(() => window.__qa.shiftSources))}`);
    await page.screenshot({ path: `validation/redesign-final-full-${width}.png`, fullPage: true });
    report.viewports.push({ width, height, ...metrics });
  }

  const count = await page.evaluate(() => window.__qa.motion.length);
  for (const top of [0, 10000, 0, 10000, 0]) {
    await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), top);
    await page.waitForTimeout(120);
  }
  assert(await page.evaluate(() => window.__qa.motion.length) === count, 'Reveals repeated');
  report.motion = { once: true, fastScroll: true, revealCount: count };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8765/');
  await page.waitForTimeout(2100);
  const sequence = await page.evaluate(() => window.__qa.motion.filter((entry) => ['header', 'eyebrow', 'heading', 'description', 'actions', 'image'].includes(entry.kind)));
  assert(sequence.map((entry) => entry.kind).join(',') === 'header,eyebrow,heading,description,actions,image', 'Hero reveal order');
  assert(sequence.every((entry, index) => entry.delay === index * 110), 'Hero reveal staggering');
  assert(sequence.every((entry) => entry.duration >= 500 && entry.duration <= 700), 'Reveal durations');
  assert(sequence[5].scale === '.99', 'Restrained image entrance');
  report.motion.entranceSequence = sequence;
  await page.getByRole('link', { name: 'Etkinlikleri Gör', exact: true }).click();
  assert(await page.evaluate(() => location.hash === '#etkinlikler'), 'Hero event CTA');
  await page.getByRole('link', { name: 'Tüm Etkinlikleri Gör', exact: true }).click();
  assert(await page.evaluate(() => location.hash === '#etkinlik-listesi'), 'All events CTA');
  for (const name of ['Catan Gecesi', 'Strateji Oyunları Akşamı', 'Açık Oyun Günü']) {
    await page.getByRole('link', { name: `${name} etkinliğine katıl`, exact: true }).click();
    assert((await page.locator('#connection-status').innerText()).includes(name), name);
  }
  for (const [selector, expected] of [['.membership [data-destination=discord]', 'Discord'], ['.community-links [data-destination=instagram]', 'Instagram'], ['.community-links [data-destination=discord]', 'Discord']]) {
    await page.locator(selector).click();
    assert((await page.locator('#connection-status').innerText()).includes(expected), expected);
  }
  for (const [name, hash] of [['Hakkımızda', '#hakkimizda'], ['Etkinlikler', '#etkinlikler'], ['Üyelik', '#uyelik'], ['Ana Sayfa', '#ana-sayfa']]) {
    await page.locator('.main-nav').getByRole('link', { name, exact: true }).click();
    assert(await page.evaluate((hash) => location.hash === hash, hash), name);
  }
  await page.goto('http://localhost:8765/');
  await page.keyboard.press('Tab');
  assert(await page.locator('.skip-link').evaluate((element) => element === document.activeElement), 'Skip link focus');
  await page.keyboard.press('Enter');
  assert(await page.evaluate(() => location.hash === '#icerik'), 'Skip link target');
  report.interactions.push('Desktop navigation, hero CTA, all events, 3 event CTAs, membership, Instagram, Discord, keyboard skip link');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:8765/');
  await page.waitForTimeout(1700);
  const toggle = page.locator('.menu-toggle');
  await toggle.click();
  assert(await toggle.getAttribute('aria-expanded') === 'true', 'Menu expanded state');
  assert(await page.locator('.main-nav a').first().evaluate((element) => element === document.activeElement), 'Menu focus');
  await page.keyboard.press('Escape');
  assert(await toggle.getAttribute('aria-expanded') === 'false', 'Escape closes menu');
  assert(await toggle.evaluate((element) => element === document.activeElement), 'Focus restoration');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  assert(await page.evaluate(() => location.hash === '#hakkimizda'), 'Keyboard menu selection');
  assert(await page.locator('#hakkimizda').evaluate((element) => element === document.activeElement), 'Section focus');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await toggle.click();
  await page.locator('.hero-image').click({ position: { x: 100, y: 100 } });
  assert(await toggle.getAttribute('aria-expanded') === 'false', 'Outside click');
  await toggle.click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForFunction(() => document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'false');
  report.interactions.push('Mobile menu, ARIA, keyboard selection, Escape, focus restoration, outside click, resize');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8765/');
  await page.waitForTimeout(150);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.getAnimations().length === 0, null, { timeout: 3000 });
  assert(await page.evaluate(() => document.getAnimations().length === 0), 'Changing reduced motion cancels entrances');
  await page.goto('http://localhost:8765/');
  assert(await page.evaluate(() => document.getAnimations().length === 0), 'Reduced motion animations');
  assert(await page.evaluate(() => [...document.querySelectorAll('[data-entrance], [data-reveal]')].every((element) => getComputedStyle(element).opacity === '1')), 'Reduced motion visibility');
  const context = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const noJavaScript = await context.newPage();
  await noJavaScript.goto('http://localhost:8765/');
  assert(await noJavaScript.locator('.main-nav').isVisible(), 'No JavaScript navigation');
  assert(await noJavaScript.evaluate(() => [...document.querySelectorAll('[data-entrance], [data-reveal]')].every((element) => getComputedStyle(element).opacity === '1')), 'No JavaScript visibility');
  assert(await noJavaScript.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No JavaScript overflow');
  await noJavaScript.screenshot({ path: 'validation/redesign-no-javascript-390.png' });
  await context.close();
  report.fallback = { reducedMotion: true, preferenceChange: true, noJavaScript: true };
  report.errors = errors;
  report.failedRequests = failedRequests;
  assert(errors.length === 0, `Browser console: ${errors.join('; ')}`);
  assert(failedRequests.length === 0, `Network failures: ${failedRequests.join('; ')}`);
  await testContext.close();
  await originalPage.emulateMedia({ reducedMotion: 'no-preference' });
  await originalPage.setViewportSize({ width: 1440, height: 900 });
  await originalPage.goto('http://localhost:8765/');
  await originalPage.waitForTimeout(1600);
  return report;
}
