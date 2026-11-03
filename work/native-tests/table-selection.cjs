const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../../outputs/墨页-Markdown编辑器.html')).href);
  const fixture='<h2>表格行列操作</h2><table><colgroup><col style="width:180px"><col style="width:240px"><col style="width:300px"></colgroup><thead><tr><th>名字</th><th>状态</th><th>备注</th></tr></thead><tbody><tr><td>第一行</td><td>进行中</td><td>保留第一行</td></tr><tr><td>第二行</td><td>完成</td><td>保留第二行</td></tr><tr><td>第三行</td><td>计划</td><td>保留第三行</td></tr></tbody></table><p>表格后面的正文。</p>';
  async function reset(){await page.evaluate(html=>{selectBlock(null);closeTableContextMenu();editor.innerHTML=html;ensureTableScrollers();applyTableWidth(editor.querySelector('table'));},fixture);}
  const cell=(r,c)=>page.locator('#editor table tr').nth(r).locator('th,td').nth(c);
  async function drag(r,c,r2,c2){const a=await cell(r,c).boundingBox(),b=await cell(r2,c2).boundingBox();await page.mouse.move(a.x+25,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+25,b.y+b.height/2,{steps:8});await page.mouse.up();}
  const scope=()=>page.evaluate(()=>tableSelectionState.scope);
  // Row/column selection must immediately enable insertion, without another click.
  await reset();await drag(2,0,2,1);
  const toolbarRight=page.locator('#tableTools button[aria-label="在右侧插入一列"]');
  assert.equal(await toolbarRight.isEnabled(),true);
  await toolbarRight.click();await toolbarRight.click();
  assert.equal(await page.locator('#editor table col').count(),5);
  assert.equal(await scope(),'row');assert.equal(await page.locator('.is-table-row-selected').count(),5);
  assert.deepEqual(await page.locator('#editor table col').evaluateAll(cols=>cols.map(col=>col.style.width)),['180px','240px','300px','120px','120px']);
  await reset();await drag(1,1,3,1);assert.equal(await toolbarRight.isEnabled(),true);
  await toolbarRight.click();assert.equal(await scope(),'col');assert.equal(await page.evaluate(()=>tableSelectionState.colIndex),2);
  assert.deepEqual(await page.locator('#editor table col').evaluateAll(cols=>cols.map(col=>col.style.width)),['180px','240px','120px','300px']);
  await cell(1,2).click({button:'right'});await page.getByRole('menuitem',{name:'在右侧插入一列'}).click();
  assert.equal(await page.locator('#editor table col').count(),5);assert.equal(await scope(),'col');
  // Exercise all four insertion directions after each whole-axis selection.
  for(const selected of ['row','col'])for(const name of ['在上方插入一行','在下方插入一行','在左侧插入一列','在右侧插入一列']){
   await reset();await drag(1,0,selected==='row'?1:3,selected==='row'?1:0);
   const control=page.locator(`#tableTools button[aria-label="${name}"]`);assert.equal(await control.isEnabled(),true);await control.click();
   assert.equal(await scope(),selected);assert.equal(await control.isEnabled(),true);
   assert.equal(await page.locator('#editor table tr').count(),name.endsWith('行')?5:4);
   assert.equal(await page.locator('#editor table col').count(),name.endsWith('列')?4:3);
   assert.equal(await page.evaluate(()=>md.includes('第一行')&&md.includes('第二行')&&md.includes('第三行')),true);
  }
  await reset();await drag(2,0,2,1);
  assert.equal(await scope(),'row');assert.equal(await page.locator('.is-table-row-selected').count(),3);
  assert.equal(await page.getByRole('button',{name:'代码换行开关',includeHidden:true}).isVisible(),false);
  await cell(2,1).click({button:'right'});
  assert.equal(await page.locator('#tableContextMenu').isVisible(),true);
  assert.equal(await page.getByRole('menuitem',{name:'删除选中行'}).isEnabled(),true);
  await page.screenshot({path:path.resolve(__dirname,'../../outputs/表格行列选择.png')});
  await page.getByRole('menuitem',{name:'删除选中行'}).click();
  assert.deepEqual(await page.locator('#editor table tr').evaluateAll(rows=>rows.map(row=>row.cells[0].textContent)),['名字','第一行','第三行']);
  assert.equal(await page.evaluate(()=>md.includes('第二行')),false);
  assert.equal(await page.locator('#editor>p').textContent(),'表格后面的正文。');
  await reset();await drag(1,1,3,1);
  assert.equal(await scope(),'col');assert.equal(await page.locator('.is-table-col-selected').count(),4);
  await cell(2,1).click({button:'right'});await page.getByRole('menuitem',{name:'删除选中列'}).click();
  assert.deepEqual(await page.locator('#editor table tr').first().locator('th').allTextContents(),['名字','备注']);
  assert.deepEqual(await page.locator('#editor table col').evaluateAll(cols=>cols.map(col=>col.style.width)),['180px','300px']);
  assert.ok(Math.abs(await page.evaluate(()=>editor.querySelector('table').getBoundingClientRect().width)-480)<=1,'Table shrinks by the deleted column width, allowing its collapsed border');
  assert.equal(await page.evaluate(()=>md.includes('进行中')),false);
  await reset();await cell(1,1).click({button:'right'});await page.getByRole('menuitem',{name:'选择整行'}).click();
  assert.equal(await scope(),'row');await cell(1,2).click({button:'right'});assert.equal(await scope(),'row');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#tableContextMenu').isVisible(),false);
  await cell(3,2).click({button:'right'});assert.equal(await scope(),'cell','Right-click outside selected row must not delete an old selection');
  await page.getByRole('menuitem',{name:'选择整列'}).click();assert.equal(await scope(),'col');
  await cell(0,2).click({button:'right'});await page.getByRole('menuitem',{name:'删除选中列'}).click();
  assert.equal(await page.locator('#editor table col').count(),2);
  await reset();await cell(0,0).click({button:'right'});await page.getByRole('menuitem',{name:'选择整行'}).click();await cell(0,1).click({button:'right'});await page.getByRole('menuitem',{name:'删除选中行'}).click();
  assert.deepEqual(await page.locator('#editor table thead th').allTextContents(),['第一行','进行中','保留第一行']);
  assert.equal(await page.locator('#editor table tr').count(),3);
  await page.evaluate(()=>{selectBlock(null);editor.innerHTML='<table><tr><th>仅一个单元格</th></tr></table>';ensureTableScrollers();});
  await cell(0,0).click({button:'right'});await page.getByRole('menuitem',{name:'选择整行'}).click();await cell(0,0).click({button:'right'});assert.equal(await page.getByRole('menuitem',{name:'删除选中行'}).isDisabled(),true);
  await page.getByRole('menuitem',{name:'选择整列'}).click();await cell(0,0).click({button:'right'});assert.equal(await page.getByRole('menuitem',{name:'删除选中列'}).isDisabled(),true);
  await page.locator('#editor').click({position:{x:10,y:10}});assert.equal(await page.locator('#tableContextMenu').isVisible(),false);
  await page.evaluate(()=>setMode('read'));await cell(0,0).click({button:'right'});assert.equal(await page.locator('#tableContextMenu').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('Passed: actual mouse row/column drag; context selection; scoped row/column deletion; Markdown updates; adjacent widths preserved; selection target consistency; Escape/outside dismissal; last row/column guards; read mode; no runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
