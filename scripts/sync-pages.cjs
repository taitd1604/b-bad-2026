const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
fs.writeFileSync(path.join(root,'balanced.html'),original);
const reference=original.replace('<body data-format="balanced">','<body data-format="reference">').replace('<title>B-Bad 2026 · Giải 10 người</title>','<title>B-Bad 2026 · Bảng cũ 9 người</title>');
fs.writeFileSync(path.join(root,'reference.html'),reference);
console.log('Synced balanced.html alias and reference.html archived nine-player page.');
