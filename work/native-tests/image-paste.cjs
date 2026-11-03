const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+GWBsWQAAAABJRU5ErkJggg==';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../../outputs/墨页-Markdown编辑器.html')).href);
  async function pasteImages(target,count=1,type='image/png',bytes=png){await page.evaluate(({target,count,type,bytes})=>{const raw=Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)),transfer=new DataTransfer();for(let i=0;i<count;i++)transfer.items.add(new File([raw],`clipboard-${i}.png`,{type}));const node=target==='source'?source:editor;node.dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer,bubbles:true,cancelable:true}))},{target,count,type,bytes})}
  await page.evaluate(()=>{editor.innerHTML='<p>光标前后</p>';const text=editor.firstChild.firstChild,r=document.createRange();r.setStart(text,2);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);editor.focus()});
  await pasteImages('editor');await page.waitForFunction(()=>editor.querySelector('img')?.complete&&md.includes('data:image/png;base64,'));
  assert.equal(await page.locator('#editor img').getAttribute('alt'),'粘贴图片');assert.match(await page.evaluate(()=>md),/^光标!\[粘贴图片\]\(data:image\/png;base64,/);
  await page.evaluate(()=>{render()});assert.equal(await page.locator('#editor img').count(),1);assert.match(await page.locator('#editor img').getAttribute('src'),/^data:image\/png;base64,/);
  await page.evaluate(()=>{editor.innerHTML='<pre><code>const x = 1;</code></pre>';const t=editor.querySelector('code').firstChild,r=document.createRange();r.setStart(t,5);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r)});await pasteImages('editor',2);await page.waitForFunction(()=>editor.querySelectorAll('img').length===2);assert.equal(await page.locator('#editor>pre+ p img').count(),2);assert.equal(await page.locator('#editor pre img').count(),0);
  await page.evaluate(()=>setMode('source'));await page.evaluate(()=>{source.value='正文';source.setSelectionRange(2,2);source.focus()});await pasteImages('source',2);await page.waitForFunction(()=>source.value.match(/!\[粘贴图片\]/g)?.length===2);assert.equal(await page.evaluate(()=>source.selectionStart===source.selectionEnd),true);
  await page.evaluate(()=>setMode('visual'));assert.equal(await page.locator('#editor img').count(),2);
  await page.evaluate(()=>setMode('read'));await page.waitForTimeout(500);const before=await page.evaluate(()=>md);await pasteImages('editor');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>md),before);
  await page.evaluate(()=>setMode('visual'));await page.evaluate(()=>{md='x'.repeat(Math.floor(2.2*1024*1024));editor.innerHTML='<p><br></p>';editor.focus()});await pasteImages('editor');await page.waitForFunction(()=>$('toast').textContent.includes('图片过大'));assert.equal(await page.locator('#editor img').count(),0);
  assert.deepEqual(errors,[]);console.log('Passed: visual caret paste, Markdown data URL roundtrip, multiple images, code-block escape, source paste, read-mode guard, size feedback; no runtime errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
