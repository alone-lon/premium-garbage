#!/usr/bin/env node
/* ============================================================
 * 精品垃圾全自动生产线 factory.js
 * 用法: node factory.js <batch.js>
 *   batch.js 导出 concepts 数组,每条生成一个藏品页;
 *   同时解析现有 index.html 目录并完整重建(计数/页脚同步)。
 * 交互模板(kind): counter | queue | detector | generator | meter | slots
 * ============================================================ */
const fs = require('fs');
const path = require('path');

/* ---------- 共享样式(藏品页) ---------- */
const CSS = [
':root{--paper:#FAF6EE;--ink:#1C1914;--muted:#8A8272;--seal:#BF3A2B;--faint:#DDD5C3}',
'*{margin:0;padding:0;box-sizing:border-box}',
'body{background:var(--paper);color:var(--ink);font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif;font-size:16px;line-height:1.85;-webkit-font-smoothing:antialiased}',
'::selection{background:var(--seal);color:#fff}',
'.page{max-width:800px;margin:0 auto;padding:60px 28px 110px}',
'.meta{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid var(--ink);padding-bottom:14px;font-size:12px;letter-spacing:.18em;color:var(--muted)}',
'.meta b{color:var(--ink);font-weight:600}',
'.mast{padding:50px 0 36px;text-align:center}',
'.mast .en{font-size:11px;letter-spacing:.42em;color:var(--muted);margin-bottom:22px}',
'.mast h1{font-size:clamp(30px,6vw,50px);font-weight:700;letter-spacing:.13em;font-family:"Songti SC","STSong","SimSun",Georgia,serif}',
'.mast .sub{margin-top:18px;font-size:14px;color:var(--muted)}',
'.console{border:1px solid var(--ink);padding:38px 30px 32px;margin-top:8px;text-align:center}',
'.big{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:clamp(36px,8vw,60px);font-weight:700;color:var(--seal);line-height:1.25;min-height:1.25em}',
'.big.plain{color:var(--ink)}',
'.status{font-size:14px;color:var(--muted);margin-top:10px;min-height:2.2em}',
'.ctrl{margin-top:22px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap}',
'.btn{display:inline-block;border:1px solid var(--ink);background:transparent;color:var(--ink);padding:12px 26px;font-size:15px;letter-spacing:.12em;cursor:pointer;font-family:inherit;transition:background .15s,color .15s}',
'.btn:hover{background:var(--ink);color:var(--paper)}',
'.btn.accent{border-color:var(--seal);color:var(--seal)}',
'.btn.accent:hover{background:var(--seal);color:#fff}',
'.input{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}',
'.input input{border:1px solid var(--faint);background:transparent;color:var(--ink);padding:12px 14px;font:inherit;font-size:14px;width:min(440px,100%)}',
'.input input:focus{outline:none;border-color:var(--ink)}',
'.console textarea{width:100%;min-height:110px;border:1px solid var(--faint);background:transparent;color:var(--ink);padding:14px;font:inherit;font-size:14px;line-height:1.8;resize:vertical}',
'.console textarea:focus{outline:none;border-color:var(--ink)}',
'.metrics{display:flex;border-top:1px solid var(--faint);border-bottom:1px solid var(--faint);margin-top:26px}',
'.m{flex:1;padding:16px 6px;text-align:center;border-left:1px solid var(--faint)}',
'.m:first-child{border-left:none}',
'.m .k{font-size:11px;letter-spacing:.2em;color:var(--muted)}',
'.m .v{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:20px;font-weight:700;margin-top:3px}',
'.m .v small{font-size:12px;font-weight:400;color:var(--muted)}',
'.meter{height:14px;border:1px solid var(--ink);margin-top:22px;padding:2px}',
'.meter .fill{height:100%;background:var(--seal);opacity:.75}',
'.result{margin-top:28px;display:none}',
'.result .num{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:clamp(32px,7vw,52px);font-weight:700;color:var(--seal)}',
'.result .verdict{font-size:13px;color:var(--muted);margin-top:6px;letter-spacing:.08em;min-height:1.8em}',
'.output{margin-top:26px;border-top:1px solid var(--faint);padding-top:22px;display:none;text-align:left}',
'.output .fact{font-size:13px;color:var(--muted);letter-spacing:.06em}',
'.output .deep{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:17px;line-height:2.1;margin-top:12px;word-break:break-all}',
'.report{margin-top:56px}',
'.sec-tag{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:10px;margin-bottom:4px}',
'.sec-tag .zh{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:20px;font-weight:700;letter-spacing:.14em}',
'.sec-tag .en{font-size:10px;letter-spacing:.3em;color:var(--muted)}',
'ul{list-style:none}',
'li{padding:13px 2px;border-bottom:1px solid var(--faint);font-size:14px;display:flex;gap:14px}',
'li .t{color:var(--seal);font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-weight:700;white-space:nowrap}',
'table{width:100%;border-collapse:collapse}',
'th,td{text-align:left;padding:12px 6px;border-bottom:1px solid var(--faint);vertical-align:top}',
'th{font-size:11px;letter-spacing:.22em;color:var(--muted);font-weight:400;border-bottom:1px solid var(--ink)}',
'td:first-child{width:26%;font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-weight:700}',
'td:last-child{color:var(--muted)}',
'.note{margin-top:44px;border:1px solid var(--ink);padding:26px 30px}',
'.note .title{font-size:12px;letter-spacing:.24em;color:var(--muted);margin-bottom:10px}',
'.note p{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:17px;line-height:2}',
'.end{margin-top:76px;border-top:1px solid var(--ink);padding-top:30px;text-align:center}',
'.end .zh{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:21px;letter-spacing:.1em}',
'.end .fine{margin-top:14px;font-size:12px;color:var(--muted);letter-spacing:.08em;line-height:2}'
].join('\n');

/* ---------- 共享样式(总目录页,与手工版一致) ---------- */
const INDEX_CSS = [
':root{--paper:#FAF6EE;--ink:#1C1914;--muted:#8A8272;--seal:#BF3A2B;--faint:#DDD5C3}',
'*{margin:0;padding:0;box-sizing:border-box}',
'body{background:var(--paper);color:var(--ink);font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif;font-size:16px;line-height:1.85;-webkit-font-smoothing:antialiased}',
'.page{max-width:860px;margin:0 auto;padding:60px 28px 110px}',
'.meta{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid var(--ink);padding-bottom:14px;font-size:12px;letter-spacing:.18em;color:var(--muted)}',
'.meta b{color:var(--ink);font-weight:600}',
'.mast{padding:64px 0 48px;text-align:center}',
'.mast .en{font-size:11px;letter-spacing:.42em;color:var(--muted);margin-bottom:26px}',
'.mast h1{font-size:clamp(40px,8vw,64px);font-weight:700;letter-spacing:.16em;font-family:"Songti SC","STSong","SimSun",Georgia,serif}',
'.mast .sub{margin-top:22px;font-size:15px;color:var(--muted);max-width:520px;margin-left:auto;margin-right:auto}',
'.mast .sub2{margin-top:8px;font-size:13px;color:var(--muted)}',
'.stats{display:flex;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);margin-bottom:64px}',
'.s{flex:1;padding:22px 10px;text-align:center;border-left:1px solid var(--faint)}',
'.s:first-child{border-left:none}',
'.s .k{font-size:11px;letter-spacing:.2em;color:var(--muted)}',
'.s .v{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:28px;font-weight:700;margin-top:4px}',
'.s .v small{font-size:12px;font-weight:400;color:var(--muted)}',
'.sec-tag{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:10px;margin-bottom:6px}',
'.sec-tag .zh{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:20px;font-weight:700;letter-spacing:.14em}',
'.sec-tag .en{font-size:10px;letter-spacing:.3em;color:var(--muted)}',
'.item{display:flex;gap:20px;padding:22px 4px;border-bottom:1px solid var(--faint);text-decoration:none;color:var(--ink);transition:background .12s}',
'.item:hover{background:#F1EADB}',
'.item .no{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:24px;font-weight:700;color:var(--seal);width:44px;flex-shrink:0}',
'.item .body{flex:1}',
'.item .name{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:18px;font-weight:700;letter-spacing:.04em}',
'.item .name .arrow{color:var(--muted);font-size:14px;margin-left:8px}',
'.item .desc{font-size:13.5px;color:var(--muted);margin-top:3px}',
'.item .tag{font-size:11px;letter-spacing:.14em;color:var(--muted);white-space:nowrap;padding-top:6px}',
'.philosophy{margin-top:60px;border:1px solid var(--ink);padding:30px 32px}',
'.philosophy .title{font-size:12px;letter-spacing:.24em;color:var(--muted);margin-bottom:12px}',
'.philosophy p{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:17px;line-height:2.1}',
'.end{margin-top:80px;border-top:1px solid var(--ink);padding-top:32px;text-align:center}',
'.end .zh{font-family:"Songti SC","STSong","SimSun",Georgia,serif;font-size:22px;letter-spacing:.12em}',
'.end .fine{margin-top:16px;font-size:12px;color:var(--muted);letter-spacing:.08em;line-height:2.1}',
'@media (max-width:560px){.stats{flex-wrap:wrap}.s{flex:1 1 50%}.s:nth-child(3){border-left:none;border-top:1px solid var(--faint)}.s:nth-child(4){border-top:1px solid var(--faint)}.item .tag{display:none}}'
].join('\n');

/* ---------- 工具 ---------- */
function J(x){ return JSON.stringify(x).replace(/</g,'\\u003c'); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

/* ---------- 各 kind 的运行时脚本 ---------- */
function rtCounter(p){
return '(function(){\nvar $=function(id){return document.getElementById(id)};\nvar D='+J(p)+';\nvar log=$("log"),n=0;\nfunction record(tag,text){\nif(log.children.length===1&&log.children[0].textContent.indexOf("暂无")>-1)log.innerHTML="";\nvar li=document.createElement("li");\nli.innerHTML=\'<span class="t">\'+tag+\'</span><span>\'+text+\'</span>\';\nlog.prepend(li);\n}\nD.btns.forEach(function(b,i){\nvar c=0;\n$("btn"+i).addEventListener("click",function(){\nc++;n++;\nvar line=b.lines[(c-1)%b.lines.length];\nif(b.bigs)$("big").textContent=b.bigs[(c-1)%b.bigs.length];\n$("status").textContent=line;\nrecord(b.tag||("第 "+n+" 次"),line);\n});\n});\n})();';
}
function rtQueue(p){
return '(function(){\nvar $=function(id){return document.getElementById(id)};\nvar D='+J(p)+';\nvar log=$("log"),total=0,calls=0;\nfunction record(tag,text){\nif(log.children.length===1&&log.children[0].textContent.indexOf("暂无")>-1)log.innerHTML="";\nvar li=document.createElement("li");\nli.innerHTML=\'<span class="t">\'+tag+\'</span><span>\'+text+\'</span>\';\nlog.prepend(li);\n}\n$("takeBtn").addEventListener("click",function(){\ntotal++;\n$("ticket").textContent=D.prefix+"-"+String(1000+total).slice(1);\n$("took").textContent=total+" 张";\nvar s=D.takeLines[(total-1)%D.takeLines.length];\n$("status").textContent=s;\nrecord("取号 #"+total,s);\n});\n$("callBtn").addEventListener("click",function(){\ncalls++;\nvar s=D.scenes[(calls-1)%D.scenes.length];\n$("status").textContent=s;\nrecord("广播 #"+calls,s);\n});\n})();';
}
function rtMeter(p){
return '(function(){\nvar $=function(id){return document.getElementById(id)};\nvar D='+J(p)+';\nvar log=$("log"),i=0,n=0;\nfunction record(tag,text){\nif(log.children.length===1&&log.children[0].textContent.indexOf("暂无")>-1)log.innerHTML="";\nvar li=document.createElement("li");\nli.innerHTML=\'<span class="t">\'+tag+\'</span><span>\'+text+\'</span>\';\nlog.prepend(li);\n}\n$("goBtn").addEventListener("click",function(){\ni++;n++;\nvar v=$("src").value.trim();\nvar line=v?D.reasons[(i-1)%D.reasons.length]:D.empty;\n$("status").textContent=line;\n$("fill").style.width=D.pct+"%";\nrecord("第 "+n+" 次检测",line);\n});\n})();';
}
function rtDetector(p){
return '(function(){\nvar $=function(id){return document.getElementById(id)};\nvar D='+J(p)+';\nfunction render(rows){\nvar ul=$("breakdown");ul.innerHTML="";\nrows.forEach(function(r){\nvar li=document.createElement("li");\nli.innerHTML=\'<span class="t">\'+r[0]+\'</span><span>\'+r[1]+\' · <span style="color:var(--muted)">\'+r[2]+\'</span></span>\';\nul.appendChild(li);\n});\n}\nfunction detect(){\nvar t=$("src").value.trim();\n$("result").style.display="block";\nif(!t){$("num").textContent=D.empty.num;$("verdict").textContent=D.empty.verdict;render(D.empty.breakdown);return;}\n$("num").textContent=D.num;$("verdict").textContent=D.verdict;render(D.breakdown);\n}\n$("goBtn").addEventListener("click",detect);\ndocument.querySelectorAll("[data-sample]").forEach(function(b){\nb.addEventListener("click",function(){$("src").value=D.samples[+b.getAttribute("data-sample")];detect();});\n});\n})();';
}
function rtGenerator(p){
return '(function(){\nvar $=function(id){return document.getElementById(id)};\nvar D='+J(p)+';\nfunction rnd(a){return a[Math.floor(Math.random()*a.length)]}\nfunction fill(t,ev){\nreturn t.replace(/\\{ev\\}/g,ev||"").replace(/\\{a\\}/g,rnd(D.a)).replace(/\\{b\\}/g,rnd(D.b)).replace(/\\{c\\}/g,rnd(D.c||D.b));\n}\n$("goBtn").addEventListener("click",function(){\nvar ev=$("src").value.trim()||D.defaultEv;\n$("fact").textContent="原始素材:"+(ev||"(空)");\n$("deep").innerHTML=fill(D.tmpl,ev);\n$("out").style.display="block";\n});\ndocument.querySelectorAll("[data-ev]").forEach(function(b){\nb.addEventListener("click",function(){$("src").value=b.getAttribute("data-ev");$("goBtn").click();});\n});\n})();';
}
function rtSlots(p){
return '(function(){\nvar $=function(id){return document.getElementById(id)};\nvar D='+J(p)+';\nvar log=$("log"),used=[],n=0;\nfunction record(tag,text){\nif(log.children.length===1&&log.children[0].textContent.indexOf("暂无")>-1)log.innerHTML="";\nvar li=document.createElement("li");\nli.innerHTML=\'<span class="t">\'+tag+\'</span><span>\'+text+\'</span>\';\nlog.prepend(li);\n}\nfunction serve(){\nif(used.length>=D.pools.length)used=[];\nvar idx;do{idx=Math.floor(Math.random()*D.pools.length);}while(used.indexOf(idx)>-1);\nused.push(idx);n++;\nvar q=D.pools[idx];\n$("big").textContent=q.q;$("status").textContent=q.w;\nrecord("第 "+n+" 抽","结果:"+q.q+"。");\n}\n$("goBtn").addEventListener("click",serve);\n$("moreBtn").addEventListener("click",function(){serve();record("追加","已加抽一份。运气这东西,本机管供应,不管效果。");});\n})();';
}

/* ---------- 各 kind 的控制台 HTML ---------- */
function metricsHtml(ms){
  if(!ms) return '';
  return '<div class="metrics">'+ms.map(function(m){
    var idAttr=m[2]?(' id="'+m[2]+'"'):'';
    return '<div class="m"><div class="k">'+m[0]+'</div><div class="v"'+idAttr+'>'+m[1]+'</div></div>';
  }).join('')+'</div>';
}
function logSection(p){
  return '<div class="log"><div class="sec-tag"><span class="zh">'+(p.logTitle||'实时记录')+'</span><span class="en">'+(p.logEn||'LOG')+'</span></div><ul id="log"><li style="color:var(--muted)">'+p.logEmpty+'</li></ul></div>';
}
function consoleHtml(c){
  var p=c.p;
  if(c.kind==='counter'){
    var btns=p.btns.map(function(b,i){
      return '<button class="btn'+(i===0?' accent':'')+'" id="btn'+i+'">'+b.label+'</button>';
    }).join('');
    return '<div class="console"><div class="big" id="big">'+p.big0+'</div><div class="status" id="status">'+p.stat0+'</div>'+metricsHtml(p.metrics)+'<div class="ctrl">'+btns+'</div></div>'+logSection(p);
  }
  if(c.kind==='queue'){
    return '<div class="console"><div class="big" id="ticket">--</div><div class="status" id="status">'+p.stat0+'</div>'+metricsHtml(p.metrics)+'<div class="ctrl"><button class="btn accent" id="takeBtn">'+p.takeLabel+'</button><button class="btn" id="callBtn">'+p.callLabel+'</button></div></div>'+logSection(p);
  }
  if(c.kind==='meter'){
    return '<div class="console"><div class="big" id="big">'+p.big0+'</div><div class="meter"><div class="fill" id="fill" style="width:'+p.pct+'%"></div></div><div class="status" id="status">'+p.stat0+'</div><div class="input" style="margin-top:20px"><input id="src" type="text" placeholder="'+p.inputPh+'" maxlength="30"></div><div class="ctrl"><button class="btn accent" id="goBtn">'+p.btnLabel+'</button></div>'+metricsHtml(p.metrics)+'</div>'+logSection(p);
  }
  if(c.kind==='detector'){
    var smp=p.samples.map(function(s,i){
      return '<button class="btn" data-sample="'+i+'">'+(p.sampleLabels?p.sampleLabels[i]:('示例·'+(i+1)))+'</button>';
    }).join('');
    return '<div class="console"><textarea id="src" placeholder="'+p.placeholder+'"></textarea><div class="ctrl"><button class="btn accent" id="goBtn">'+p.btnLabel+'</button>'+smp+'</div><div class="result" id="result"><div class="num" id="num">--</div><div class="verdict" id="verdict"></div></div></div><div class="report"><div class="sec-tag"><span class="zh">'+(p.reportTitle||'成分分析报告')+'</span><span class="en">'+(p.reportEn||'LAB REPORT')+'</span></div><ul id="breakdown"></ul></div>';
  }
  if(c.kind==='generator'){
    var pre=p.presets.map(function(x){
      return '<button class="btn" data-ev="'+x.ev+'">'+x.label+'</button>';
    }).join('');
    return '<div class="console"><div class="input"><input id="src" type="text" placeholder="'+p.placeholder+'" maxlength="60"></div><div class="ctrl" style="margin-top:16px"><button class="btn accent" id="goBtn">'+p.btnLabel+'</button>'+pre+'</div><div class="output" id="out"><div class="fact" id="fact"></div><div class="deep" id="deep"></div></div></div>';
  }
  if(c.kind==='slots'){
    return '<div class="console"><div class="big" id="big">'+p.big0+'</div><div class="status" id="status">'+p.why0+'</div><div class="ctrl"><button class="btn accent" id="goBtn">'+p.btnLabel+'</button><button class="btn" id="moreBtn">'+(p.moreLabel||'再来一次')+'</button></div>'+metricsHtml(p.metrics)+'</div>'+logSection(p);
  }
  throw new Error('未知 kind: '+c.kind);
}
function rtFor(c){
  if(c.kind==='counter')return rtCounter(c.p);
  if(c.kind==='queue')return rtQueue(c.p);
  if(c.kind==='meter')return rtMeter(c.p);
  if(c.kind==='detector')return rtDetector(c.p);
  if(c.kind==='generator')return rtGenerator(c.p);
  if(c.kind==='slots')return rtSlots(c.p);
  throw new Error('未知 kind: '+c.kind);
}
function tableHtml(t){
  if(!t)return '';
  var head='<tr>'+t.head.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr>';
  var rows=t.rows.map(function(r){
    return '<tr>'+r.map(function(cell,i){return '<td'+(i===0?'':' style="font-family:inherit;font-weight:400"')+'>'+cell+'</td>';}).join('')+'</tr>';
  }).join('');
  return '<div class="report" style="margin-top:44px"><div class="sec-tag"><span class="zh">'+t.title+'</span><span class="en">'+t.en+'</span></div><table>'+head+rows+'</table></div>';
}

/* ---------- 页面组装 ---------- */
function pageHtml(c){
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>'+c.name+'</title>\n<style>\n'+CSS+'\n</style>\n</head>\n<body>\n<div class="page">\n  <div class="meta">\n    <span>'+c.meta[0]+'</span>\n    <span>'+c.meta[1]+'</span>\n    <span>'+c.meta[2]+'</span>\n  </div>\n\n  <div class="mast">\n    <div class="en">'+c.en+'</div>\n    <h1>'+c.name+'</h1>\n    <div class="sub">'+c.sub+'</div>\n  </div>\n\n  '+consoleHtml(c)+'\n\n  '+tableHtml(c.table)+'\n\n  <div class="note">\n    <div class="title">'+c.note.title+'</div>\n    <p>'+c.note.text+'</p>\n  </div>\n\n  <div class="end">\n    <div class="zh">'+c.endZh+'</div>\n    <div class="fine">\n      '+c.endFine+'\n    </div>\n  </div>\n</div>\n\n<script>\n'+rtFor(c)+'\n</script>\n</body>\n</html>\n';
}

/* ---------- 解析现有目录 ---------- */
function parseCatalog(html){
  var items=[];
  var re=/<a class="item" href="([^"]+)">[\s\S]*?<span class="no">(\d+)<\/span>[\s\S]*?<span class="name">([^<]*)<span class="arrow">[\s\S]*?<span class="desc">([\s\S]*?)<\/span>[\s\S]*?<span class="tag">([^<]*)<\/span>[\s\S]*?<\/a>/g;
  var m;
  while((m=re.exec(html))){ items.push({file:m[1],no:+m[2],name:m[3],desc:m[4],tag:m[5]}); }
  return items;
}

/* ---------- 重建 index.html ---------- */
function buildIndex(catalog){
  var N=catalog.length;
  var items=catalog.slice().sort(function(a,b){return a.no-b.no;}).map(function(it){
    return '    <a class="item" href="'+it.file+'">\n      <span class="no">'+String(it.no).padStart(2,'0')+'</span>\n      <span class="body">\n        <span class="name">'+it.name+'<span class="arrow">→</span></span>\n        <span class="desc">'+it.desc+'</span>\n      </span>\n      <span class="tag">'+it.tag+'</span>\n    </a>';
  }).join('\n\n');
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>精品垃圾 · 项目总览</title>\n<style>\n'+INDEX_CSS+'\n</style>\n</head>\n<body>\n<div class="page">\n  <div class="meta">\n    <span>项目编号 <b>PGCB-2026</b></span>\n    <span>藏品总数 <b>'+N+' 件</b></span>\n    <span>总价值 <b>0,品质保证</b></span>\n  </div>\n\n  <div class="mast">\n    <div class="en">PREMIUM&nbsp;GARBAGE&nbsp;COLLECTION</div>\n    <h1>精品垃圾</h1>\n    <div class="sub">一个认真的垃圾合集:每一件都精心设计、郑重排版、官方口吻,然后严格保证毫无用处。</div>\n    <div class="sub2">「垃圾是放错位置的资源。本项目为了保持纯粹,拒绝回到正确位置。」</div>\n  </div>\n\n  <div class="stats">\n    <div class="s"><div class="k">垃圾件数</div><div class="v">'+N+'<small> 件</small></div></div>\n    <div class="s"><div class="k">实用功能</div><div class="v">0<small> 项</small></div></div>\n    <div class="s"><div class="k">依赖</div><div class="v">0<small> 个,双击即开</small></div></div>\n    <div class="s"><div class="k">回收价值</div><div class="v">无</div></div>\n  </div>\n\n  <div class="catalog">\n    <div class="sec-tag"><span class="zh">藏品目录</span><span class="en">CATALOGUE</span></div>\n\n'+items+'\n  </div>\n\n  <div class="philosophy">\n    <div class="title">垃圾哲学</div>\n    <p>本项目的每一件作品,都严格按照「三无标准」生产:无用途、无意义、无回收价值。唯一的共同点,是每一件都做得非常认真——认真,是垃圾与废品的唯一区别。</p>\n  </div>\n\n  <div class="end">\n    <div class="zh">看完了?那你的垃圾鉴赏力已通过认证。</div>\n    <div class="fine">\n      精品垃圾系列 · 持续扩产中 · 全自动生产线已投产,第 '+(N+1)+' 件已在流水线上排队<br>\n      本页本身也是垃圾——是目录,也是藏品之一\n    </div>\n  </div>\n</div>\n</body>\n</html>\n';
}

/* ---------- 主流程 ---------- */
function main(){
  var batchFile=process.argv[2];
  if(!batchFile){ console.error('用法: node factory.js <batch.js>'); process.exit(1); }
  var concepts=require(path.resolve(batchFile));
  if(!Array.isArray(concepts)||!concepts.length){ console.error('批次文件需导出非空 concepts 数组'); process.exit(1); }
  var idxPath=path.resolve(__dirname,'index.html');
  var idxOld=fs.readFileSync(idxPath,'utf8');
  var catalog=parseCatalog(idxOld);
  if(!catalog.length){ console.error('解析现有目录失败(0 条),为防误覆盖 index.html,已中止。'); process.exit(1); }
  var known={}; catalog.forEach(function(it){known[it.file]=true;});
  var nos={}; catalog.forEach(function(it){nos[it.no]=true;});
  var written=[];
  concepts.forEach(function(c){
    ['file','no','name','en','tag','sub','meta','kind','p','note','endZh','endFine','desc'].forEach(function(k){
      if(c[k]===undefined){ console.error('概念缺字段 '+k+': '+(c.file||c.name||'?')); process.exit(1); }
    });
    if(known[c.file]){ console.error('文件名冲突(已存在于目录): '+c.file); process.exit(1); }
    if(nos[c.no]){ console.error('编号冲突(已存在于目录): '+c.no); process.exit(1); }
    if(fs.existsSync(path.resolve(__dirname,c.file))){ console.error('文件已存在: '+c.file); process.exit(1); }
  });
  concepts.forEach(function(c){
    fs.writeFileSync(path.resolve(__dirname,c.file),pageHtml(c));
    catalog.push({file:c.file,no:c.no,name:c.name,desc:c.desc,tag:c.tag});
    known[c.file]=true; nos[c.no]=true;
    written.push(c.no+' '+c.file);
  });
  catalog.sort(function(a,b){return a.no-b.no;});
  fs.writeFileSync(idxPath,buildIndex(catalog));
  console.log('生产线运转完毕:');
  console.log('  新增 '+written.length+' 件: '+written.join(', '));
  console.log('  目录总数: '+catalog.length+' 件');
  console.log('  index.html 已重建');
}
main();
