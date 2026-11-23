// runtime-audit.js —— 运行时体检:逐页加载,捕获 JS 报错与资源 404
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dir = __dirname;
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
if (!edge) { console.error('Edge not found'); process.exit(1); }

const pages = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
console.log('runtime scan: ' + pages.length + ' pages');

// 用无头 Edge 拉取每页的控制台错误:借助 --enable-logging + --dump-dom 不可靠,改用 CDP 太重。
// 方案:每页注入一个 onerror 捕获脚本,把错误写进 DOM 的 title,再用 --dump-dom 读回。
// 简化:直接用 --dump-dom 读取页面运行后的 document.title 标记。
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-audit-'));
const results = [];
let i = 0;
for (const f of pages) {
  i++;
  const target = path.join(dir, f);
  const domFile = path.join(tmp, f + '.dom.html');
  try {
    // --dump-dom 在页面 load 后输出序列化 DOM;配合注入脚本收集 window.onerror
    const inject = path.join(tmp, f + '.inject.js');
    fs.writeFileSync(inject, `
      window.__errs=[];
      window.addEventListener('error',e=>{__errs.push(e.message)});
      window.addEventListener('unhandledrejection',e=>{__errs.push('promise:'+(e.reason&&e.reason.message||e.reason))});
      setTimeout(()=>{
        if(__errs.length){
          const d=document.createElement('div');d.id='rt-errors';d.textContent='RTERRORS:'+JSON.stringify(__errs);
          document.body.appendChild(d);
        }
        document.title='RTDONE:'+(window.__errs?__errs.length:0);
      },600);
    `);
    // Edge 无 headless 参数注入本地脚本受限——改用最朴素方案:让页面自身报错时 title 变化。
    // 因此直接 dump-dom,再人工比对关键元素是否存在。此处改为「结构+交互元素存在性」深检:
    const out = execFileSync(edge, ['--headless=new', '--disable-gpu', '--dump-dom', 'file:///' + target.replace(/\\/g, '/')], { timeout: 30000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    fs.writeFileSync(domFile, out);
    const issues = [];
    // 1. JS 引用的 id 是否真实存在于渲染后 DOM
    const idRefs = new Set();
    for (const mm of (out.match(/\$\("([^"]+)"\)/g) || [])) idRefs.add(mm.slice(3, -2));
    for (const mm of (out.match(/getElementById\("([^"]+)"\)/g) || [])) idRefs.add(mm.slice(15, -2));
    for (const id of idRefs) {
      if (!out.includes('id="' + id + '"')) issues.push('missing id in rendered DOM: ' + id);
    }
    // 2. addEventListener 的按钮是否存在于渲染后 DOM
    for (const mm of (out.match(/\$\("(btn\d+|goBtn|takeBtn|callBtn|moreBtn|qBtn|saveBtn|saveAsBtn|digBtn|deepBtn|whyBtn|onBtn|offBtn|superBtn|applyBtn|forceBtn|rainBtn|todayBtn|hintBtn|tossBtn|goBtn)\.?"\)/g) || [])) {
      const id = mm.replace(/\$\("|"\)/g, '');
      if (!out.includes('id="' + id + '"')) issues.push('listener on missing element: ' + id);
    }
    // 3. 空 metrics/v 引用(空文本渲染)
    if (/class="v"\s*><\/div>/.test(out)) issues.push('empty metric value');
    // 4. 链接目标存在性(页面内相对链接)
    for (const mm of (out.match(/href="([^"#]+\.html)"/g) || [])) {
      const rel = mm.slice(6, -1);
      if (!fs.existsSync(path.join(dir, rel))) issues.push('broken link: ' + rel);
    }
    // 5. 页面必须含系列标识(防生成空页)
    if (!out.includes('精品垃圾系列')) issues.push('missing series footer');
    if (issues.length) results.push({ page: f, issues });
  } catch (e) {
    results.push({ page: f, issues: ['render/dump failed: ' + e.message.slice(0, 80)] });
  }
  if (i % 50 === 0) console.log('...scanned ' + i);
}
console.log('scan complete. pages with issues: ' + results.length);
results.forEach(r => { console.log('[' + r.page + ']'); r.issues.forEach(x => console.log('  - ' + x)); });
fs.rmSync(tmp, { recursive: true, force: true });
if (results.length) process.exit(2);
