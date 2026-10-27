import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const base=process.env.PREVIEW_URL || 'http://127.0.0.1:8081';
try {
 const context=await browser.newContext({acceptDownloads:true});
 const page=await context.newPage();
 const requests=[];
 page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const [width,scale] of [[320,1],[375,1],[320,2],[768,2],[1440,1]]) {
  await page.setViewportSize({width,height:1000});
  const response = await page.goto(base+'/toolkit');
  assert.equal(response.status(),200);
  assert.equal(await page.locator('.business-tools h1').count(),1,'Clean URL serves toolkit, not directory listing');
  await page.evaluate(s=>document.documentElement.style.fontSize=`${s*100}%`,scale);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`toolkit overflow ${width}/${scale}`);
  if(process.env.AXE_PATH) {
   await page.addScriptTag({path:process.env.AXE_PATH});
   assert.deepEqual(await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))),[],`toolkit accessibility ${width}/${scale}`);
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'/toolkit');
 await page.selectOption('#fit-clarity','defined');
 await page.selectOption('#fit-systems','separate');
 await page.selectOption('#fit-ownership','named');
 await page.getByRole('button',{name:'Suggest a starting point'}).click();
 assert.match(await page.locator('#fit-output').innerText(),/custom builds and integrations/i);
 await page.selectOption('#fit-ownership','missing');
 await page.getByRole('button',{name:'Suggest a starting point'}).click();
 assert.match(await page.locator('#fit-output').innerText(),/internal process owner/i);
 for(const key of ['reporting','handoff','intake']) {
  await page.locator(`[data-workflow="${key}"]`).click();
  assert.equal(await page.locator(`[data-workflow="${key}"]`).getAttribute('aria-pressed'),'true');
  assert.ok((await page.locator('#workflow-boundary').innerText()).length>40);
 }
 const sentinel='<script>window.UNSAFE=true</script> Local project';
 await page.fill('#brief-goal',sentinel);
 await page.fill('#brief-approval','Owner reviews every customer reply.');
 await page.getByRole('button',{name:'Generate brief',exact:true}).click();
 assert.match(await page.inputValue('#brief-output'),/Local project/);
 assert.equal(await page.evaluate(()=>window.UNSAFE),undefined);
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
 await page.getByRole('button',{name:'Copy current brief',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('brief-status').textContent.includes('Brief copied'));
 assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/Local project/);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}}));
 await page.getByRole('button',{name:'Copy current brief',exact:true}).click();
 await page.waitForFunction(()=>document.activeElement.id==='brief-output');
 assert.match(await page.locator('#brief-status').innerText(),/selected/i);
 await page.fill('#brief-goal','Updated before download');
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#brief-download').click();
 const download=await downloadPromise;
 assert.equal(download.suggestedFilename(),'seros-project-brief.txt');
 assert.match(readFileSync(await download.path(),'utf8'),/Updated before download/);
 assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 assert.ok(requests.every(r=>r.method==='GET' && (r.url.startsWith(base+'/')||r.url.startsWith('blob:'))),'Only local reads, no submission');
 assert.deepEqual(errors,[]);
 if(process.env.SCREENSHOT_DIR) {
  mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});
  await page.screenshot({path:process.env.SCREENSHOT_DIR+'/toolkit-1440.png',fullPage:true});
 }
 const nojs=await browser.newContext({javaScriptEnabled:false});
 const fallback=await nojs.newPage();
 await fallback.goto(base+'/toolkit');
 assert.ok(await fallback.locator('noscript').isVisible());
 assert.ok(await fallback.getByText('Read the rules, in priority order').isVisible());
 await nojs.close();
 console.log('PASS: toolkit responsive/200% text and axe checks, actual service guidance, all workflow patterns, safe brief generation, denied clipboard fallback, fresh-content text download, no storage/submission and no-JS guidance.');
} finally { await browser.close(); }
