/* Clipboard images stay inside Markdown as restricted image data URLs. */
const clipboardImageTypes=new Set(['image/png','image/jpeg','image/gif','image/webp','image/bmp']);
const clipboardImageMaxDataLength=1.8*1024*1024;
function clipboardImages(data){return [...(data?.items||[])].filter(item=>item.kind==='file'&&clipboardImageTypes.has(item.type.toLowerCase())).map(item=>item.getAsFile()).filter(Boolean)}
function readImageDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('读取剪贴板图片失败'));reader.readAsDataURL(file)})}
async function compactClipboardImage(file){
 if(file.size<=1.2*1024*1024)return readImageDataURL(file);
 try{
  const bitmap=await createImageBitmap(file),scale=Math.min(1,2560/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d',{alpha:true}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.86));
  if(!blob)throw new Error('无法压缩图片');return readImageDataURL(blob)
 }catch{return readImageDataURL(file)}
}
async function prepareClipboardImages(files){const urls=[];let total=mode==='source'?source.value.length:md.length;for(const file of files){const url=await compactClipboardImage(file);if(url.length>clipboardImageMaxDataLength||total+url.length>2.2*1024*1024)throw new Error('图片过大，请压缩后重试');urls.push(url);total+=url.length}return urls}
function insertVisualClipboardImages(urls,savedRange){
 if(!savedRange||!editor.contains(savedRange.commonAncestorContainer))return false;
 const start=savedRange.startContainer.nodeType===1?savedRange.startContainer:savedRange.startContainer.parentElement,code=start?.closest?.('pre');
 if(code){const paragraph=document.createElement('p');for(const url of urls){const img=document.createElement('img');img.src=url;img.alt='粘贴图片';paragraph.append(img)}code.after(paragraph);savedRange.selectNodeContents(paragraph);savedRange.collapse(false)}else{savedRange.deleteContents();for(const url of urls){const img=document.createElement('img');img.src=url;img.alt='粘贴图片';savedRange.insertNode(img);savedRange.setStartAfter(img);savedRange.collapse(true)}}
 const selection=getSelection();selection.removeAllRanges();selection.addRange(savedRange);range=savedRange.cloneRange();sync();return true
}
editor.addEventListener('paste',e=>{const files=clipboardImages(e.clipboardData);if(!files.length)return;if(mode!=='visual'){e.preventDefault();e.stopImmediatePropagation();toast('阅读模式下不能粘贴图片');return}e.preventDefault();e.stopImmediatePropagation();const selection=getSelection(),savedRange=selection.rangeCount?selection.getRangeAt(0).cloneRange():null;toast('正在插入图片…');prepareClipboardImages(files).then(urls=>{if(insertVisualClipboardImages(urls,savedRange))toast(files.length>1?'已粘贴 '+files.length+' 张图片':'已粘贴图片')}).catch(error=>toast(error.message))},true);
source.addEventListener('paste',e=>{if(mode!=='source')return;const files=clipboardImages(e.clipboardData);if(!files.length)return;e.preventDefault();e.stopImmediatePropagation();const start=source.selectionStart,end=source.selectionEnd;toast('正在插入图片…');prepareClipboardImages(files).then(urls=>{const markdown=urls.map(url=>'![粘贴图片]('+url+')').join('\n\n');replaceSource(start,end,markdown,start+markdown.length,start+markdown.length);toast(files.length>1?'已粘贴 '+files.length+' 张图片':'已粘贴图片')}).catch(error=>toast(error.message))},true);
