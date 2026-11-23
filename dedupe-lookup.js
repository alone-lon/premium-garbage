const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const re = /<a class="item" href="([^"]+)">[\s\S]*?<span class="no">(\d+)<\/span>[\s\S]*?<span class="name">([^<]*)<span class="arrow">/g;
const items = [];
let m;
while ((m = re.exec(html))) items.push({ no: m[2], file: m[1], name: m[3] });
const targets = ['daijia.html','daijia2.html','yijia.html','yijia2.html','liangyijia.html','liangyijia2.html','weibolu.html','weibolu2.html'];
targets.forEach(f => {
  const it = items.find(x => x.file === f);
  if (it) console.log(f + ' => ' + it.no + ' ' + it.name);
});
