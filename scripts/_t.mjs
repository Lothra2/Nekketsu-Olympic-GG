import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(process.argv[2]);
await p.waitForFunction(() => window.game?.scene.isActive('Tap'), null, { timeout: 60000 });
await p.mouse.click(400, 200);
for (let i = 0; i < 20 && !(await p.evaluate(() => window.game.scene.isActive('Title'))); i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(500); }
for (const sc of ['Basket', 'Futbol', 'Basket', 'Voley', 'Fight']) {
  const t0 = Date.now();
  await p.evaluate((s) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(s, { jugador: 'rick', rival: 'kenji', modo: '1v1' }); }, sc);
  await p.waitForFunction((s) => window.game.scene.getScene(s).sys.settings.status === 5, sc, { timeout: 60000, polling: 50 });
  console.log(sc, Date.now() - t0, 'ms');
}
await b.close();
