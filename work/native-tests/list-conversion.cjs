const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../../outputs/墨页-Markdown编辑器.html')).href);
    const input = {
      ordered: '<ol><li><strong>第一项</strong></li><li>第二项</li></ol>',
      unordered: '<ul><li><strong>第一项</strong></li><li>第二项</li></ul>',
      task: '<ul><li><input type="checkbox" checked contenteditable="false"> <strong>第一项</strong></li><li><input type="checkbox" contenteditable="false"> 第二项</li></ul>'
    };
    const selectors = {
      ordered: '#toolbar [data-cmd="insertOrderedList"]',
      unordered: '#toolbar [data-cmd="insertUnorderedList"]',
      task: '#toolbar [data-insert="task"]'
    };
    async function prepare(kind, collapsed = false) {
      await page.evaluate(({ html, collapsed }) => {
        selectBlock(null);
        editor.innerHTML = html;
        editor.focus();
        const r = document.createRange();
        r.selectNodeContents(editor.firstElementChild);
        if (collapsed) r.collapse(true);
        getSelection().removeAllRanges();
        getSelection().addRange(r);
        range = r.cloneRange();
        selectionToolRange = r.cloneRange();
      }, { html: input[kind], collapsed });
    }
    async function verify(target, checked = false) {
      const actual = await page.evaluate(() => ({
        structure: selectionStructureOf(editor.firstElementChild),
        count: editor.children.length,
        text: [...editor.querySelectorAll('li')].map(li => li.textContent.trim()),
        strong: editor.querySelectorAll('strong').length,
        checkboxes: [...editor.querySelectorAll('input[type=checkbox]')].map(input => input.checked),
        nestedLists: editor.querySelectorAll('li ul,li ol').length,
        markdown: md
      }));
      assert.equal(actual.structure, target);
      assert.equal(actual.count, 1);
      assert.deepEqual(actual.text, ['第一项', '第二项']);
      assert.equal(actual.strong, 1);
      assert.equal(actual.nestedLists, 0);
      assert.deepEqual(actual.checkboxes, target === 'task' ? [checked, false] : []);
      if (target === 'task') assert.match(actual.markdown, /- \[(?:x| )\] \*\*第一项\*\*/);
    }
    for (const source of Object.keys(input)) {
      for (const target of Object.keys(input)) {
        await prepare(source);
        await page.locator(selectors[target]).click();
        await verify(target, source === 'task' && target === 'task');
      }
    }
    await prepare('ordered', true);
    await page.locator(selectors.task).click();
    await verify('task');
    await prepare('unordered');
    await page.keyboard.press('Control+Shift+9');
    await verify('task');
    await prepare('ordered');
    await page.evaluate(() => refreshSelectionTools());
    await page.locator('#selectionTools [data-structure="task"]').click();
    await verify('task');
    await prepare('unordered', true);
    await page.evaluate(() => selectBlock(editor.firstElementChild));
    await page.locator(selectors.task).click();
    await verify('task');
    assert.deepEqual(errors, []);
    console.log('Passed: 9 list conversion combinations, caret, keyboard, floating toolbar, module selection; no runtime errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
