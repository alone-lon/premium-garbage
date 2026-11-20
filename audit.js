const fs=require('fs');
const files=fs.readdirSync('.').filter(f=>f.endsWith('.html')).sort();
const problems=[];
for(const f of files){
  const html=fs.readFileSync(f,'utf8');
  // 1. JS 语法检查(仅解析,不执行)
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  scripts.forEach((code,i)=>{
    try{ new Function(code); }
    catch(e){ problems.push('[语法] '+f+' script#'+(i+1)+': '+e.message); }
  });
  // 2. JS 引用的 id 是否存在于 HTML
  const idsUsed=new Set();
  for(const m of html.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)) idsUsed.add(m[1]);
  for(const m of html.matchAll(/\$\("([^"]+)"\)/g)) idsUsed.add(m[1]);
  const idsDefined=new Set();
  for(const m of html.matchAll(/id="([^"]+)"/g)) idsDefined.add(m[1]);
  for(const id of idsUsed) if(!idsDefined.has(id)) problems.push('[ID] '+f+': JS 引用了不存在的 id "'+id+'"');
  // 3. index.html 链接目标是否存在
  if(f==='index.html'){
    for(const m of html.matchAll(/href="([^"]+\.html)"/g)){
      if(!fs.existsSync(m[1])) problems.push('[链接] index.html: 链接目标不存在 '+m[1]);
    }
  }
  // 4. 标签配对粗查
  const tags=['span','div','a','p','ul','li','table','tr','td','th','button','section'];
  for(const tag of tags){
    const o=(html.match(new RegExp('<'+tag+'[\\s>]','g'))||[]).length;
    const c=(html.match(new RegExp('</'+tag+'>','g'))||[]).length;
    if(o!==c) problems.push('[标签] '+f+': <'+tag+'> 开 '+o+' / 闭 '+c);
  }
}
console.log('已检查 '+files.length+' 个文件: '+files.join(', '));
console.log(problems.length?('发现 '+problems.length+' 个问题:\n'+problems.join('\n')):'未发现结构性问题');
