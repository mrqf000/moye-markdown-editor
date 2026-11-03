const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../../outputs/墨页-Markdown编辑器.html')).href);
  const sample='<ul><li><span class="first">无序列表，换行后的文字应与第一行保持对齐。</span></li></ul><ol><li><span class="first">有序列表，换行后的文字应与第一行保持对齐。</span></li></ol><ul><li><input type="checkbox" checked><span class="first">任务列表，换行后的文字应与第一行保持对齐。</span></li></ul><ul><li><p><input type="checkbox"><span class="first">任务列表的段落形式也保持一致。</span></p></li></ul>';
  await page.evaluate(html=>{editor.innerHTML=html;},sample);
  const offsets=await page.locator('#editor .first').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().left));
  assert.ok(offsets.every(x=>Math.abs(x-offsets[0])<1),'All list types share the same text start, including loose task lists');
  const wrapped=await page.locator('#editor .first').evaluateAll(nodes=>nodes.map(span=>{span.append('较长的正文内容换行后仍然应该与文字起点对齐。'.repeat(12));const range=document.createRange();range.selectNodeContents(span);const lines=new Map();for(const rect of range.getClientRects())lines.set(rect.top,Math.min(lines.get(rect.top)??Infinity,rect.left));return [...lines.values()];}));
  assert.ok(wrapped.every(lines=>lines.length>1&&lines.every(x=>Math.abs(x-offsets[0])<1)),'Wrapped lines align to the text rather than the checkbox or list marker');
  for(const type of ['ol','ul']){
   await page.evaluate(type=>{let content='第六层';for(let i=0;i<6;i++)content=`<${type}><li>第${6-i}层${i?content:''}</li></${type}>`;editor.innerHTML=content;},type);
   assert.deepEqual(await page.locator(`#editor ${type}`).evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).listStyleType)),type==='ol'?['decimal','lower-alpha','lower-roman','decimal','lower-alpha','lower-roman']:['disc','circle','square','disc','circle','square']);
  }
  for(const type of ['ol','ul','task']){
   await page.evaluate(type=>{const tag=type==='ol'?'ol':'ul',prefix=type==='task'?'<input type="checkbox">':'';editor.innerHTML=`<${tag}><li>${prefix}<span>父项</span></li><li>${prefix}<strong>缩进项</strong></li><li>${prefix}<span>后项</span></li></${tag}>`;const text=editor.children[0].children[1].querySelector('strong').firstChild;editor.focus();getSelection().setBaseAndExtent(text,2,text,2);},type);
   await page.keyboard.press('Tab');
   assert.equal(await page.locator('#editor li li').count(),1);
   assert.equal(await page.evaluate(()=>getSelection().anchorNode.textContent),'缩进项');
   assert.equal(await page.evaluate(()=>getSelection().anchorOffset),2);
   const roundtrip=await page.evaluate(()=>{const html=marked.parse(md);const container=document.createElement('div');container.innerHTML=html;return {nested:container.querySelectorAll('li li').length,strong:container.querySelector('li li strong')?.textContent,tasks:container.querySelectorAll('input[type=checkbox]').length};});
   assert.deepEqual(roundtrip,{nested:1,strong:'缩进项',tasks:type==='task'?3:0});
   await page.keyboard.press('Shift+Tab');
   assert.equal(await page.locator('#editor li li').count(),0);
   assert.deepEqual(await page.locator('#editor>ul>li,#editor>ol>li').allTextContents(),['父项','缩进项','后项']);
  }
  // Outdenting an item must keep following nested siblings after it in document order.
  await page.evaluate(()=>{editor.innerHTML='<ol><li>父项<ol><li><span>子项一</span></li><li>子项二</li></ol></li><li>尾项</li></ol>';const t=editor.querySelector('span').firstChild;editor.focus();getSelection().setBaseAndExtent(t,1,t,1);});
  await page.keyboard.press('Shift+Tab');
  assert.deepEqual(await page.locator('#editor>ol>li').allTextContents(),['父项','子项一子项二','尾项']);
  await page.evaluate(html=>{editor.innerHTML='<h2>统一列表缩进</h2>'+html+'<ol><li>第一层 · 数字<ol><li>第二层 · 字母<ol><li>第三层 · 罗马数字</li></ol></li></ol></li></ol><ul><li>第一层 · 实心圆<ul><li>第二层 · 空心圆<ul><li>第三层 · 方块</li></ul></li></ul></li></ul>';},sample);
  await page.screenshot({path:path.resolve(__dirname,'../../outputs/列表缩进检查.png')});
  await page.evaluate(()=>document.body.classList.add('dark'));
  assert.deepEqual(await page.locator('#editor .first').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().left)),offsets);
  assert.deepEqual(errors,[]);
  console.log('Passed: matching text alignment for all lists and paragraph task items; six marker levels; Tab/Shift+Tab with caret preserved; nested Markdown roundtrip; sibling order; dark mode; no runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
