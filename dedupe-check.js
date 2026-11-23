const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const re = /<a class="item" href="([^"]+)">[\s\S]*?<span class="no">(\d+)<\/span>[\s\S]*?<span class="name">([^<]*)<span class="arrow">[\s\S]*?<span class="desc">([\s\S]*?)<\/span>/g;
const items = [];
let m;
while ((m = re.exec(html))) items.push({ no: +m[2], file: m[1], name: m[3] });
console.log('total items in index:', items.length);

const noDup = items.length - new Set(items.map(x => x.no)).size;
const fDup = items.length - new Set(items.map(x => x.file)).size;
const norm = s => s.replace(/[\s·•→()（）\-—、,，。·]/g, '').toLowerCase();
const nameMap = {};
let nameDups = [];
items.forEach(x => {
  const k = norm(x.name);
  (nameMap[k] = nameMap[k] || []).push(x.no + ' ' + x.name);
});
Object.entries(nameMap).forEach(([k, v]) => { if (v.length > 1) nameDups.push(v.join(' || ')); });
console.log('no dup:', noDup, '| file dup:', fDup, '| name dup groups:', nameDups.length);
nameDups.forEach(d => console.log('DUP:', d));

// 近似重名检测:名字包含相同核心词(去掉系列后缀比较)
const stemMap = {};
const stem = s => norm(s).replace(/(中心|馆|所|局|室|科|处|站|部|台|协会|研究院|研究所|办公室|委员会|管委会|工会|公司|厂|店|铺|屋|家|号|营|团|队|班|组|区|场|园|廊|城|港|湾|岛|林|堂|殿|楼|阁|亭|轩|斋|庐|庵|寺|庙|祠|观|庵|院|校|学|社|会|盟|帮|派|系|族|党|军|师|旅|团|营|连|排|班|组)$/,'');
items.forEach(x => {
  const k = stem(x.name);
  if (k.length < 2) return;
  (stemMap[k] = stemMap[k] || []).push(x.no + ' ' + x.name);
});
const stemDups = Object.entries(stemMap).filter(([k, v]) => v.length > 1);
console.log('stem-similar groups:', stemDups.length);
stemDups.forEach(([k, v]) => console.log('SIMILAR [' + k + ']:', v.join(' || ')));

// 文件名主干查重(防 guopiao / guopiao2 这类同根)
const fileMap = {};
items.forEach(x => {
  const k = x.file.replace(/\.html$/, '').replace(/(2|3)$/, '');
  (fileMap[k] = fileMap[k] || []).push(x.file);
});
const fileDups = Object.entries(fileMap).filter(([k, v]) => v.length > 1);
console.log('file-stem groups:', fileDups.length);
fileDups.forEach(([k, v]) => console.log('FILESTEM [' + k + ']:', v.join(', ')));

const sorted = items.map(x => x.no).sort((a, b) => a - b);
const gaps = [];
for (let i = 1; i < sorted.length; i++) { if (sorted[i] - sorted[i - 1] > 1) gaps.push(sorted[i - 1] + '..' + sorted[i]); }
console.log('number gaps:', gaps.length ? gaps.join(', ') : 'none', '| min:', sorted[0], 'max:', sorted[sorted.length - 1]);
