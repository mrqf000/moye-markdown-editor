/* Visual hints are CSS-generated, never document text or exported Markdown. */
let hintFrame=0,composingHint=false;
function refreshInputHint(){hintFrame=0;editor.querySelectorAll('[data-input-hint]').forEach(el=>el.removeAttribute('data-input-hint'));editor.removeAttribute('data-input-hint');if(mode!=='visual'||composingHint)return;let block=null;const selection=getSelection();if(editor.contains(document.activeElement)&&selection.rangeCount&&selection.isCollapsed&&editor.contains(selection.anchorNode)){const el=selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement;if(el.closest('pre,code,[contenteditable="false"]'))return;block=el.closest('p,div,li,h1,h2,h3,h4,h5,h6,td,th');if(block&&!editor.contains(block))block=null;if(el===editor){const at=editor.childNodes[selection.anchorOffset];if(at?.nodeType===1&&/^(P|DIV)$/.test(at.tagName))block=at;else if(!editor.childNodes.length)block=editor}}
if(!block&&!editor.textContent.trim()&&!editor.querySelector('img,figure,hr,table,pre,ul,ol'))block=editor.querySelector('p,div')||editor;
if(!block||block.textContent.replace(/[\s\u200b]/g,'')||block.querySelector('img,figure,hr,table,pre,input,ul,ol,p,div'))return;
const label=/^H[1-6]$/.test(block.tagName)?'输入标题…':/^(TD|TH)$/.test(block.tagName)?'输入内容…':'输入文字，或粘贴链接…';block.setAttribute('data-input-hint',label)}
function scheduleInputHint(){if(!hintFrame)hintFrame=requestAnimationFrame(refreshInputHint)}
for(const name of ['selectionchange','focusin','focusout'])document.addEventListener(name,scheduleInputHint);
editor.addEventListener('input',scheduleInputHint);editor.addEventListener('compositionstart',()=>{composingHint=true;scheduleInputHint()});editor.addEventListener('compositionend',()=>{composingHint=false;scheduleInputHint()});
new MutationObserver(scheduleInputHint).observe(editor,{childList:true,characterData:true,subtree:true});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',scheduleInputHint));
scheduleInputHint();
