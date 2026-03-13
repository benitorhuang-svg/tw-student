const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/?year=114&county=10010&tab=county&zoom=10&lat=23.4260&lon=120.5373');
  await page.waitForTimeout(3000);
  const initialZoom = await page.evaluate(()=>{
    const mapEl = document.querySelector('.atlas-map-canvas');
    return mapEl && mapEl._leaflet_map && mapEl._leaflet_map.getZoom();
  });
  console.log('initial zoom', initialZoom);
  await page.click('.map-breadcrumb__link');
  await page.waitForTimeout(2000);
  const afterZoom = await page.evaluate(()=>{
    const mapEl = document.querySelector('.atlas-map-canvas');
    return mapEl && mapEl._leaflet_map && mapEl._leaflet_map.getZoom();
  });
  console.log('zoom after click', afterZoom);
  console.log('url', page.url());
  await browser.close();
})();