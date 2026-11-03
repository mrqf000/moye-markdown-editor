const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '../..');
  const markdown = fs.readFileSync(path.join(root, 'examples/墨页功能展示.md'), 'utf8');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(root, 'outputs/墨页-Markdown编辑器.html')).href);
    await page.evaluate(({ markdown }) => {
      filename = '墨页功能展示.md';
      md = markdown;
      source.value = markdown;
      const documentState = currentDocument();
      documentState.name = filename;
      documentState.text = markdown;
      render();
      drawDocumentTabs();
      setMode('visual');
      setDocumentDrawer(false);
      setOutlineCollapsed(false);
      document.body.classList.remove('dark', 'focus');
      document.getElementById('canvas').scrollTop = 0;
      updateMeta();
    }, { markdown });
    await page.addStyleTag({ content: '.toast,.selection-tools,.block-tools,.link-panel,.color-palette{display:none!important} *{caret-color:transparent!important}' });
    await page.waitForTimeout(800);
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'docs/moye-editor-overview.png') });
    console.log('Created docs/moye-editor-overview.png');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

