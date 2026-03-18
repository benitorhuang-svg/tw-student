const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('pageerror', e => console.log('PAGE_ERR:', e.message));
  await p.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 20000 });
  
  // Expand the trend chart accordion
  await p.locator('text=全台各級學制歷年學生人數').click({ timeout: 5000 });
  await p.waitForTimeout(800);
  
  // Get all SVG text elements
  const els = await p.$$('.stacked-area-chart__svg text');
  const texts = [];
  for (const e of els) { texts.push(await e.textContent()); }
  
  const deltas = texts.filter(t => t && (t.includes('+') || /^-/.test(t) || t.includes('±')));
  console.log('Total SVG texts:', texts.length);
  console.log('Delta texts:', deltas.length);
  console.log('Samples:', deltas.slice(0, 20).join(' | '));
  console.log('All texts:', texts.join(' | '));
  
  // Test governance flyout
  await p.locator('#footer-governance-toggle').click({ timeout: 5000 });
  await p.waitForTimeout(600);
  console.log('Flyout visible:', await p.locator('#governance-flyout-panel').isVisible());
  
  await b.close();
})().catch(e => console.error(e.message));
