const puppeteer = require('puppeteer');

const URL = 'https://otonami.io/epk/route14band';

async function measure(page, vw) {
  return await page.evaluate(() => {
    const num = (el, prop) => (el ? parseFloat(getComputedStyle(el)[prop]) : null);
    const q = (s) => document.querySelector(s);
    const hero = q('.theme-brutalist .hero');
    const firstSection = q('.theme-brutalist section:not(.hero)');
    const bioGrid = q('.theme-brutalist .bio-grid');
    const sidebar = q('.theme-brutalist .bio-sidebar');
    const pickupCard = q('.theme-brutalist .pickup-card');
    const pickupVisual = q('.theme-brutalist .pickup-visual');
    const grainEl = q('.theme-brutalist');

    // Section structure: collect numbered section labels in order.
    const labels = [...document.querySelectorAll('.theme-brutalist .section-label')].map(
      (e) => e.textContent.trim()
    );
    const hasDiscoSection = labels.some((l) => /discograph/i.test(l));
    const discoListUnderPlaylist = !!q('.theme-brutalist .pickup .disco-list, .theme-brutalist .playlist-block .disco-list') || !!q('.theme-brutalist #featured .disco-list');

    // bio-grid track sizes
    let bioCols = null;
    if (bioGrid) bioCols = getComputedStyle(bioGrid).gridTemplateColumns;

    // pickup card right-edge gap test: card width vs container content width
    let pickupCardRect = pickupCard ? pickupCard.getBoundingClientRect() : null;
    let containerRect = pickupCard ? pickupCard.closest('.container').getBoundingClientRect() : null;
    let discoListRect = null;
    const dl = q('.theme-brutalist #featured .disco-list');
    if (dl) discoListRect = dl.getBoundingClientRect();

    return {
      vw: window.innerWidth,
      heroH: hero ? hero.getBoundingClientRect().height : null,
      heroVhPct: hero ? +(hero.getBoundingClientRect().height / window.innerHeight * 100).toFixed(1) : null,
      sectionPadTop: num(firstSection, 'paddingTop'),
      sectionPadBottom: num(firstSection, 'paddingBottom'),
      bioCols,
      sidebarPosition: sidebar ? getComputedStyle(sidebar).position : null,
      pickupCardCols: pickupCard ? getComputedStyle(pickupCard).gridTemplateColumns : null,
      pickupVisualH: pickupVisual ? +pickupVisual.getBoundingClientRect().height.toFixed(0) : null,
      pickupCardW: pickupCardRect ? +pickupCardRect.width.toFixed(0) : null,
      containerW: containerRect ? +containerRect.width.toFixed(0) : null,
      pickupCardLeft: pickupCardRect ? +pickupCardRect.left.toFixed(0) : null,
      discoListLeft: discoListRect ? +discoListRect.left.toFixed(0) : null,
      discoListRight: discoListRect ? +discoListRect.right.toFixed(0) : null,
      pickupCardRight: pickupCardRect ? +pickupCardRect.right.toFixed(0) : null,
      grainContent: grainEl ? getComputedStyle(grainEl, '::before').content : null,
      labels,
      hasDiscoSection,
      discoListUnderPlaylist,
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const out = {};
  for (const vw of [1440, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width: vw, height: 900, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
    // settle fonts/animations
    await new Promise((r) => setTimeout(r, 1200));
    // Trigger scroll-reveal IntersectionObserver so every section is visible.
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y <= h; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    });
    out[vw] = await measure(page, vw);
    await page.screenshot({ path: `scripts/brutalist-${vw}.png`, fullPage: true });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})();
