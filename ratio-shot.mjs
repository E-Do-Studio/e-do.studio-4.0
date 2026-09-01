import { chromium } from 'playwright';
const OUT =
  '/private/tmp/claude-501/-Users-theodaguier-orca-workspaces-e-do-studio-4-0-limpet/463799c8-bab5-4538-8ff7-bb8e41d4b214/scratchpad/ratio';
const TAG = process.argv[2];
const SIZES = [
  [1280, 720],
  [1440, 800],
  [1440, 900],
  [1920, 1080],
  [1440, 1400],
  [390, 844],
  [900, 900],
];
const b = await chromium.launch();
for (const [w, h] of SIZES) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:5173/fr', { waitUntil: 'networkidle' });
  await p.waitForTimeout(450);
  const r = await p.evaluate(() => {
    const fmt = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return (
        Math.round(r.width) +
        'x' +
        Math.round(r.height) +
        ' =' +
        (r.width / r.height).toFixed(2)
      );
    };
    const btns = [...document.querySelectorAll('button,a')].filter(
      (b) => (b.getAttribute('aria-label') || '') === 'Galerie',
    );
    return {
      galerie: fmt(btns[0]),
      showreel: fmt(btns[1]),
      docH: document.documentElement.scrollHeight,
      winH: window.innerHeight,
      scroll: Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      ),
      overflowX:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  console.log(`${TAG} ${w}x${h}`.padEnd(22), JSON.stringify(r));
  await p.screenshot({ path: `${OUT}/${TAG}-${w}x${h}.png` });
  await p.close();
}
await b.close();
