const fs = require('fs');
const files = fs.readdirSync('.').filter(f => /^[a-z0-9-]+\.html$/.test(f) && f !== 'index.html' && f !== 'curtain-call.html');
function extractD(s) {
  const start = s.indexOf('var D=');
  if (start === -1) return null;
  let i = s.indexOf('{', start);
  if (i === -1) return null;
  const from = i;
  let depth = 0, inStr = false, q = null;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === q) inStr = false; continue; }
    if (ch === '"' || ch === "'") { inStr = true; q = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return s.slice(from, i + 1); }
  }
  return null;
}
function arrItems(block, key) {
  let total = 0, idx = 0, count = 0;
  const re = new RegExp('"' + key + '"\\s*:\\s*\\[', 'g');
  while (true) {
    re.lastIndex = idx;
    const m = re.exec(block);
    if (!m) break;
    let depth = 1, i = re.lastIndex;
    for (; i < block.length; i++) {
      const ch = block[i];
      if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (depth === 0) break; }
    }
    const body = block.slice(re.lastIndex, i);
    const strs = body.match(/"(?:[^"\\]|\\.)*"/g);
    total += strs ? strs.length : 0;
    idx = i; count++;
  }
  return { items: total, arrays: count };
}
const std = { counter: '姣忔寜閽?lines>=8', queue: 'takeLines>=8 & scenes>=8', meter: 'reasons>=8', slots: 'pools>=12', generator: 'presets>=5 & notes>=5', detector: 'samples>=6' };
const work = [];
let nodata = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const block = extractD(s);
  if (!block) { nodata++; work.push({ file: f, kind: 'handmade', fresh: -1, target: null, deficit: 0, detail: '鎵嬪伐鏃朵唬椤甸潰,鏃犳爣鍑嗘暟鎹潡' }); continue; }
  const c = {};
  for (const key of ['lines', 'takeLines', 'scenes', 'reasons', 'pools', 'presets', 'notes', 'samples']) c[key] = arrItems(block, key);
  const fresh = c.lines.items + c.takeLines.items + c.scenes.items + c.reasons.items + c.pools.items + c.presets.items + c.notes.items;
  let kind = '?';
  if (c.lines.arrays > 0) kind = 'counter';
  else if (c.takeLines.items > 0 || c.scenes.items > 0) kind = 'queue';
  else if (c.reasons.items > 0) kind = 'meter';
  else if (c.pools.items > 0) kind = 'slots';
  else if (c.presets.items > 0 || c.notes.items > 0) kind = 'generator';
  else if (c.samples.items > 0) kind = 'detector';
  let target = 0, detail = '';
  if (kind === 'counter') { target = 8 * c.lines.arrays; detail = 'btns=' + c.lines.arrays; }
  else if (kind === 'queue') { target = 16; detail = 'take=' + c.takeLines.items + ' scenes=' + c.scenes.items; }
  else if (kind === 'meter') { target = 8; detail = 'reasons=' + c.reasons.items; }
  else if (kind === 'slots') { target = 12; detail = 'pools=' + c.pools.items; }
  else if (kind === 'generator') { target = 10; detail = 'presets=' + c.presets.items + ' notes=' + c.notes.items; }
  else if (kind === 'detector') { target = 6; detail = 'samples=' + c.samples.items; }
  const deficit = Math.max(0, target - fresh);
  work.push({ file: f, kind, fresh, target, deficit, detail, std: std[kind] || '' });
}
work.sort((a, b) => (b.deficit - a.deficit) || (a.fresh - b.fresh));
fs.writeFileSync('optimize-worklist.json', JSON.stringify({ updated: new Date().toISOString(), std, total: work.length, queue: work }, null, 1));
const need = work.filter(w => w.deficit > 0);
console.log('handmade(no D):', nodata, '| need enrich:', need.length, '| already ok:', work.length - nodata - need.length);
const byKind = {};
for (const w of need) byKind[w.kind] = (byKind[w.kind] || 0) + 1;
console.log('need by kind:', JSON.stringify(byKind));
console.log('--- round1 candidates (10 weakest) ---');
for (const w of need.slice(0, 10)) console.log(w.file + '\t' + w.kind + '\tfresh=' + w.fresh + ' target=' + w.target + '\t' + w.detail);

