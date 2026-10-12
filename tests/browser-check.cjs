const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const qa = path.resolve(__dirname, '../.qa');
fs.mkdirSync(qa, {recursive:true});

async function score(page,id,a,b) {
  await page.locator(`[data-score="${id}"]`).click();
  await page.locator('#score-a').fill(String(a));
  await page.locator('#score-b').fill(String(b));
  await page.locator('#score-form [type="submit"]').click();
  await page.locator('#score-dialog').waitFor({state:'hidden'});
}
async function menu(page,action) {
  await page.locator('#tools-menu summary').click();
  await page.locator(action).click();
}

(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.goto('http://127.0.0.1:4186/reference.html');
  await page.locator('.player-card').first().waitFor();
  assert.equal(await page.locator('.player-card').count(),9);
  assert.equal(await page.locator('#phase-button').isDisabled(),true);
  await page.screenshot({path:path.join(qa,'desktop-empty.png'),fullPage:true});

  const ids=['tai','kha','hiep','ninh','minh','giang','tien','hoang','bau'];
  for(let slot=0;slot<ids.length;slot++) {
    await page.locator(`[data-select="${ids[slot]}"]`).click();
    await page.locator(slot===8 ? '.bye-card [data-slot="8"]' : `[data-slot="${slot}"]`).first().click();
  }
  assert.match(await page.locator('.bye-card').innerText(),/Báu/);
  assert.equal(await page.locator('#phase-button').isDisabled(),false);
  await page.waitForTimeout(800);
  await page.screenshot({path:path.join(qa,'desktop-draw.png'),fullPage:true});
  await page.locator('#phase-button').click();
  assert.equal(await page.locator('[data-slot]').count(),0);

  await page.locator('[data-score="m1"]').click();
  await page.locator('#score-form [type="submit"]').click();
  assert.equal(await page.locator('#score-dialog').isVisible(),true);
  await page.locator('#score-a').fill('21');
  await page.locator('#score-b').fill('21');
  await page.locator('#score-form [type="submit"]').click();
  assert.match(await page.locator('#score-error').innerText(),/bằng nhau|không thể/);
  await page.locator('#score-dialog [data-close]').first().click();

  for(const [id,a,b] of [['m1',21,15],['m2',21,10],['m3',21,16],['m4',21,19],['m5',21,18],['m6',21,18],['m7',15,21],['m8',18,21]]) await score(page,id,a,b);
  await page.locator('#champion-dialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#champion-name').innerText(),'Tài');
  await page.screenshot({path:path.join(qa,'champion.png'),fullPage:true});
  await page.locator('#champion-dialog [data-close]').first().click();
  assert.equal(await page.locator('#match-progress').innerText(),'8 / 8 trận hoàn tất');
  await page.screenshot({path:path.join(qa,'desktop-completed.png'),fullPage:true});

  await score(page,'m1',25,23);
  assert.equal(await page.locator('#match-progress').innerText(),'8 / 8 trận hoàn tất');
  await page.locator('[data-score="m1"]').click();
  await page.locator('#score-a').fill('10');
  await page.locator('#score-b').fill('21');
  await page.locator('#score-form [type="submit"]').click();
  await page.locator('#confirm-dialog').waitFor({state:'visible'});
  assert.match(await page.locator('#confirm-description').innerText(),/6, 7, 8/);
  await page.locator('#confirm-accept').click();
  await page.waitForFunction(()=>document.querySelector('#match-progress').textContent==='5 / 8 trận hoàn tất');
  await page.locator('#score-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('#match-progress').innerText(),'5 / 8 trận hoàn tất');
  assert.match(await page.locator('[data-match="m6"]').innerText(),/Kha/);
  assert.equal(await page.locator('[data-champion]').count(),0);
  await page.reload();
  assert.equal(await page.locator('#match-progress').innerText(),'5 / 8 trận hoàn tất');
  await page.locator('#undo-button').click();
  assert.equal(await page.locator('#match-progress').innerText(),'8 / 8 trận hoàn tất');

  const downloadPromise=page.waitForEvent('download');
  await menu(page,'#export-button');
  const download=await downloadPromise;
  const backup=path.join(qa,'backup.json');
  await download.saveAs(backup);
  const data=JSON.parse(fs.readFileSync(backup,'utf8'));
  assert.equal(data.state.results.m8.b,21);
  await menu(page,'#reset-button');
  await page.locator('#confirm-accept').click();
  await page.waitForFunction(()=>document.querySelector('#allocation-label').textContent==='Đã xếp 0 / 9 người');
  assert.equal(await page.locator('#allocation-label').innerText(),'Đã xếp 0 / 9 người');
  await page.locator('#import-file').setInputFiles(backup);
  await page.locator('#confirm-dialog').waitFor({state:'visible'});
  await page.locator('#confirm-accept').click();
  await page.waitForFunction(()=>document.querySelector('#match-progress').textContent==='8 / 8 trận hoàn tất');
  assert.equal(await page.locator('#match-progress').innerText(),'8 / 8 trận hoàn tất');
  assert.match(await page.locator('[data-champion]').innerText(),/Tài/);

  const bad=path.join(qa,'invalid-backup.json');
  fs.writeFileSync(bad,JSON.stringify({...data,state:{...data.state,slots:Array(9).fill('tai')}}));
  await page.locator('#import-file').setInputFiles(bad);
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('trùng'));
  assert.equal(await page.locator('#match-progress').innerText(),'8 / 8 trận hoàn tất');

  await page.locator('[data-score="m2"]').click();
  await page.locator('#clear-score-button').click();
  await page.locator('#confirm-accept').click();
  await page.locator('#score-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('#match-progress').innerText(),'5 / 8 trận hoàn tất');
  await page.keyboard.press('Control+z');
  assert.equal(await page.locator('#match-progress').innerText(),'8 / 8 trận hoàn tất');
  await page.locator('#phase-button').click();
  await page.locator('#confirm-accept').click();
  await page.waitForFunction(()=>document.querySelector('#match-progress').textContent==='0 / 8 trận hoàn tất');
  assert.equal(await page.locator('#allocation-label').innerText(),'Đã xếp 9 / 9 người');
  assert.equal(await page.locator('#match-progress').innerText(),'0 / 8 trận hoàn tất');
  await page.locator('#undo-button').click();

  await page.locator('#presentation-button').click();
  assert.equal(await page.locator('body.presentation').count(),1);
  assert.equal(await page.locator('.roster-panel').isVisible(),false);
  await page.screenshot({path:path.join(qa,'presentation.png'),fullPage:true});
  await page.locator('#presentation-button').click();
  await page.setViewportSize({width:1280,height:800});
  await page.screenshot({path:path.join(qa,'macbook-size.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(qa,'mobile.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-champion]').click();
  assert.equal(await page.locator('.confetti-piece').count(),0);
  await page.locator('#champion-dialog [data-close]').first().click();
  await page.setViewportSize({width:1440,height:1000});
  await menu(page,'#reset-button');
  await page.locator('#confirm-accept').click();
  await page.waitForFunction(()=>document.querySelector('#allocation-label').textContent==='Đã xếp 0 / 9 người');
  await page.locator('[data-select="tai"]').dragTo(page.locator('[data-slot="0"]'));
  assert.match(await page.locator('[data-slot="0"]').innerText(),/Tài/);
  await page.locator('[data-select="kha"]').click();
  await page.locator('[data-slot="1"]').click();
  await page.locator('[data-select="tai"]').click();
  await page.locator('#clear-placement').click({timeout:3000});
  assert.match(await page.locator('[data-slot="0"]').innerText(),/Chọn người chơi/);
  assert.match(await page.locator('[data-slot="1"]').innerText(),/Kha/);

  await page.goto('http://127.0.0.1:4186/balanced.html');
  assert.equal(await page.locator('#allocation-label').innerText(),'Đã xếp 0 / 10 người');
  assert.equal(await page.locator('.player-card').count(),10);
  assert.equal(await page.locator('[data-select="bach"]').count(),1);
  assert.equal(await page.locator('.bye-card').count(),0);
  assert.equal(await page.locator('#format-balanced[aria-current="page"]').count(),1);
  const balancedIds=['tai','kha','hiep','bau','minh','giang','tien','hoang','ninh','bach'];
  for(let slot=0;slot<10;slot++){
    if(slot===9) assert.equal(await page.locator('#phase-button').isDisabled(),true);
    await page.locator(`[data-select="${balancedIds[slot]}"]`).click();
    await page.locator(`[data-slot="${slot}"]`).click();
  }
  await page.screenshot({path:path.join(qa,'balanced-draw.png'),fullPage:true});
  await page.locator('#phase-button').click();
  for(const id of ['m1','m2','m3','m4','m5','m6','m7','m8','m9']) await score(page,id,21,10);
  await page.locator('#champion-dialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#champion-name').innerText(),'Tài');
  await page.locator('#champion-dialog [data-close]').first().click();
  assert.match(await page.locator('[data-match="m9"]').innerText(),/Tài/);
  assert.match(await page.locator('[data-match="m9"]').innerText(),/Hiệp/);
  assert.equal(await page.locator('#match-progress').innerText(),'9 / 9 trận hoàn tất');
  await page.screenshot({path:path.join(qa,'balanced-completed.png'),fullPage:true});
  await page.locator('[data-score="m1"]').click();
  await page.locator('#score-a').fill('10');
  await page.locator('#score-b').fill('21');
  await page.locator('#score-form [type="submit"]').click();
  await page.locator('#confirm-dialog').waitFor({state:'visible'});
  assert.match(await page.locator('#confirm-description').innerText(),/3, 7, 9/);
  await page.locator('#confirm-accept').click();
  await page.waitForFunction(()=>document.querySelector('#match-progress').textContent==='6 / 9 trận hoàn tất');
  await page.locator('#undo-button').click();
  await page.locator('#import-file').setInputFiles(backup);
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Bảng cũ'));
  assert.equal(await page.locator('#match-progress').innerText(),'9 / 9 trận hoàn tất');
  await page.reload();
  assert.equal(await page.locator('#match-progress').innerText(),'9 / 9 trận hoàn tất');
  await page.goto('http://127.0.0.1:4186/');
  assert.equal(await page.locator('#match-progress').innerText(),'9 / 9 trận hoàn tất');
  assert.equal(await page.locator('.player-card').count(),10);
  await page.goto('http://127.0.0.1:4186/reference.html');
  assert.equal(await page.locator('#allocation-label').innerText(),'Đã xếp 1 / 9 người');
  assert.match(await page.locator('[data-slot="1"]').innerText(),/Kha/);

  const blockedContext=await browser.newContext();
  await blockedContext.addInitScript(()=>{Object.defineProperty(Storage.prototype,'setItem',{value(){throw new DOMException('quota','QuotaExceededError');}});});
  const blocked=await blockedContext.newPage();
  await blocked.goto('http://127.0.0.1:4186/reference.html');
  await blocked.locator('[data-select="tai"]').click();
  await blocked.locator('[data-slot="0"]').click();
  assert.equal(await blocked.locator('#storage-alert').isVisible(),true);
  assert.equal(await blocked.locator('#save-label').innerText(),'Chưa lưu trên máy');
  await blockedContext.close();
  const foreignState=await page.evaluate(()=>JSON.parse(localStorage.getItem('b-bad-2026:desk:balanced:v2')).state);
  const wrongContext=await browser.newContext();
  await wrongContext.addInitScript(payload=>localStorage.setItem('b-bad-2026:desk:v1',JSON.stringify({state:payload,history:[]})),foreignState);
  const wrongPage=await wrongContext.newPage();
  await wrongPage.goto('http://127.0.0.1:4186/reference.html');
  assert.equal(await wrongPage.locator('#allocation-label').innerText(),'Đã xếp 0 / 9 người');
  assert.equal(await wrongPage.locator('#phase-button-label').innerText(),'Bắt đầu thi đấu');
  await wrongContext.close();
  const legacyContext=await browser.newContext();
  const legacy={state:{version:1,tournament:'B-Bad 2026',format:'balanced',phase:'draw',slots:['tai','kha',null,null,null,null,null,null,null],results:{}},history:[]};
  await legacyContext.addInitScript(payload=>{if(!localStorage.getItem('b-bad-2026:desk:balanced:v1'))localStorage.setItem('b-bad-2026:desk:balanced:v1',JSON.stringify(payload));},legacy);
  const legacyPage=await legacyContext.newPage();
  await legacyPage.goto('http://127.0.0.1:4186/');
  assert.equal(await legacyPage.locator('#allocation-label').innerText(),'Đã xếp 0 / 10 người');
  await legacyPage.locator('[data-select="bach"]').click();
  await legacyPage.locator('[data-slot="9"]').click();
  assert.deepEqual(await legacyPage.evaluate(()=>JSON.parse(localStorage.getItem('b-bad-2026:desk:balanced:v1'))),legacy);
  const oldDownload=legacyPage.waitForEvent('download');
  await menu(legacyPage,'#legacy-export-button');
  const legacyFile=path.join(qa,'legacy-nine.json');
  await (await oldDownload).saveAs(legacyFile);
  assert.deepEqual(JSON.parse(fs.readFileSync(legacyFile,'utf8')).state,legacy.state);
  await legacyPage.locator('#import-file').setInputFiles(legacyFile);
  await legacyPage.waitForFunction(()=>document.querySelector('#toast').textContent.includes('thể thức cũ'));
  assert.equal(await legacyPage.locator('#allocation-label').innerText(),'Đã xếp 1 / 10 người');
  await legacyContext.close();
  assert.deepEqual(errors,[]);
  await browser.close();

  let safari='WebKit runtime unavailable; Safari not directly tested';
  try {
    const wb=await webkit.launch({headless:true});
    const wp=await wb.newPage({viewport:{width:1280,height:800}});
    await wp.goto('http://127.0.0.1:4186/reference.html');
    await wp.locator('[data-select="bau"]').click();
    await wp.locator('.bye-card [data-slot="8"]').click();
    assert.match(await wp.locator('.bye-card').innerText(),/Báu/);
    await wb.close();
    safari='WebKit manual placement PASS';
  }catch(error){if(!String(error).includes('Executable doesn\'t exist'))throw error;}
  console.log(JSON.stringify({result:'PASS',flows:['archived manual allocation and external bye','tie and blank validation','archived eight-match championship','score correction cascade','refresh and undo','export/import and corrupt import','clear results','reopen draw','presentation','mobile layout','reduced motion','drag placement','return a player to roster','ten-player nine-match championship and correction','independent formats and shared ten-player alias','wrong-format stored data','legacy preservation and download','storage failure'],browserErrors:errors,webkit:safari,screenshots:qa},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
