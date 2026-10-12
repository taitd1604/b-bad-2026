const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const balanced=original.replace('<body data-format="reference">','<body data-format="balanced">').replace('<title>B-Bad 2026 · Đường đến ngôi vô địch</title>','<title>B-Bad 2026 · Sơ loại và tứ kết</title>');
fs.writeFileSync(path.join(root,'balanced.html'),balanced);
console.log('Synced balanced.html from the shared page shell.');
