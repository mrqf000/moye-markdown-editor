const fs = require('fs');
let html = fs.readFileSync('work/editor.html','utf8');
html = html.replace("+'`'.repeat(ticks)+'\\n'+text", "+'`'.repeat(ticks)+(node.querySelector('code')?.className.match(/language-([\\w+-]+)/)?.[1]||'')+'\\n'+text");
html = html.replace('/*MARKED_LIBRARY*/',()=>fs.readFileSync('work/marked.js','utf8'));
const path = require('path');
const lucide = require('lucide');
const names='Bold Italic Strikethrough List ListOrdered Undo2 Redo2 Code ListTodo Quote Link Image Table2 SquareCode Minus FolderOpen Download Moon Sun Scan Minimize FileText Keyboard X Type Heading1 Heading2 Heading3 Heading4 Heading5 Heading6 ChevronDown ChevronUp ChevronLeft ChevronRight AArrowUp AArrowDown Baseline ListTree Palette PaintBucket Paintbrush2 Check ExternalLink Pencil Unlink Plus History PanelsTopLeft Globe Play Monitor LayoutList Maximize2 RotateCcw PenLine Code2 BookOpen Rows3 Columns3 Trash2'.split(' ');
const nodes=Object.fromEntries(names.map(name=>{if(!lucide[name])throw new Error('Missing icon '+name);return [name,lucide[name]]}));
const lucideRoot=path.dirname(require.resolve('lucide/package.json'));
const license=fs.readFileSync(path.join(lucideRoot,'LICENSE'),'utf8');
html=html.replace('</style>','\n'+fs.readFileSync('work/editor-layout.css','utf8')+'\n</style>');
const enhancements=fs.readFileSync('work/editor-enhancements.js','utf8').replace('/*ICON_NODES*/',JSON.stringify(nodes))+'\n'+fs.readFileSync('work/editor-input.js','utf8')+'\n'+fs.readFileSync('work/editor-images.js','utf8')+'\n'+fs.readFileSync('work/editor-links.js','utf8')+'\n'+fs.readFileSync('work/editor-documents.js','utf8')+'\n'+fs.readFileSync('work/editor-titles.js','utf8');
const highlight=Buffer.from(fs.readFileSync('work/highlight.min.js','utf8')).toString('base64');
html=html.replace('</body>',()=>'<script src="data:text/javascript;base64,'+highlight+'"></script><script>\n/*\n'+license+'\n*/\n'+enhancements+'\n'+fs.readFileSync('work/editor-placeholder.js','utf8')+'\n/*\n'+fs.readFileSync('work/highlight-LICENSE.txt','utf8')+'\n*/\n'+fs.readFileSync('work/editor-custom.js','utf8')+'\n</script></body>');
// In-app previews may suppress new-window requests. Ordinary navigation is reliable.
html=html.replaceAll("'_blank'","'_self'").replaceAll('target="_blank"','target="_self"');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
for (const script of scripts) new Function(script[1]);
if(scripts.length!==3 || !html.includes('function serialize')) throw new Error('Invalid bundle');
fs.writeFileSync('outputs/墨页-Markdown编辑器.html',html);
console.log('Standalone HTML built; all three JavaScript blocks pass syntax validation.');

