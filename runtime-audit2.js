// runtime-audit2.js —— 真运行时体检:逐页启动 Edge,捕获控制台 JS 异常
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
if (!edge) { console.error('Edge not found'); process.exit(1); }

const pages = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
console.log('runtime scan2: ' + pages.length + ' pages');

const results = [];
let i = 0;
for (const f of pages) {
  i++;
  const target = 'file:///' + path.join(dir, f).replace(/\\/g, '/');
  const r = spawnSync(edge, ['--headless=new', '--disable-gpu', '--enable-logging=stderr', '--v=0', '--dump-dom', target], { timeout: 30000, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, windowsHide: true });
  const errs = [];
  const lines = (r.stderr || '').split(/\r?\n/);
  for (const line of lines) {
    const mm = line.match(/CONSOLE\(\d+\)\]\s*"(.+?)"\s*,\s*source/);
    if (!mm) continue;
    const msg = mm[1];
    if (/browser is shutting down|runtime\.lastError/i.test(msg)) continue;
    if (/Uncaught|SyntaxError|ReferenceError|TypeError|is not defined|is not a function|cannot read|null is not/i.test(msg)) {
      errs.push(msg.slice(0, 160));
    }
  }
  // 结构复检(修正切片):渲染 DOM 里 id 引用必须存在
  const out = r.stdout || '';
  const idRefs = new Set();
  for (const mm of (out.match(/\$\("([^"]+)"\)/g) || [])) idRefs.add(mm.slice(3, -2));
  for (const mm of (out.match(/getElementById\("([^"]+)"\)/g) || [])) idRefs.add(mm.slice(16, -2));
  for (const id of idRefs) {
    if (id && !out.includes('id="' + id + '"')) errs.push('missing id in DOM: ' + id);
  }
  if (!out.includes('</html>')) errs.push('page did not render completely');
  if (errs.length) results.push({ page: f, errs });
  if (i % 60 === 0) console.log('...scanned ' + i);
}
console.log('scan2 complete. pages with real issues: ' + results.length);
results.forEach(r => { console.log('[' + r.page + ']'); r.errs.forEach(x => console.log('  - ' + x)); });
