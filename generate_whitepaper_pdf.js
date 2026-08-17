const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const htmlPath = path.resolve(__dirname, 'whitepaper.html');
  const outputPath = path.resolve(process.env.HOME, 'Desktop', 'Amber_Avenue_Whitepaper.pdf');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Hide site header/footer/action bar for PDF
  await page.evaluate(() => {
    document.querySelectorAll('.site-header, .site-footer, .wp-bar, #header, #footer').forEach(el => {
      el.style.display = 'none';
    });
    // Remove wrapper padding for tighter layout
    const wp = document.querySelector('.wp');
    if (wp) { wp.style.padding = '0'; wp.style.maxWidth = '100%'; }
  });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: false,
    scale: 0.78,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '12mm',
      right: '12mm'
    },
    displayHeaderFooter: false
  });

  console.log(`PDF saved: ${outputPath}`);
  const fs = require('fs');
  const stats = fs.statSync(outputPath);
  console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);

  await browser.close();
})();
