// node tests/play.js  (serves this folder itself)
const { chromium, webkit, devices } = require('/workspace/pwt/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(fs.readFileSync(path.join(root, 'index.html'))); }).listen(8777);
const out = []; let fails = 0;
const ok = (n, c) => { out.push((c ? 'PASS ' : 'FAIL ') + n); if (!c) fails++; };
(async () => {
  for (const [name, bt, ctxOpt] of [['webkit-ipad', webkit, devices['iPad (gen 7) landscape']], ['webkit-ipad-portrait', webkit, devices['iPad (gen 7)']], ['chromium', chromium, { viewport: { width: 1280, height: 800 } }]]) {
    const b = await bt.launch(), p = await (await b.newContext(ctxOpt)).newPage(), errs = [];
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    const T = s => name + ': ' + s;
    await p.goto('http://localhost:8777/'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${root}/shots/${name}-start.png` });
    await p.click('#startBtn'); ok(T('start button starts game'), await p.evaluate(() => RR.state) === 'play');
    await p.evaluate(() => RR.gems = []);
    const pos = () => p.evaluate(() => RR.players.map(q => [q.x, q.y]));
    let a = await pos(); await p.keyboard.down('KeyD'); await p.waitForTimeout(400); await p.keyboard.up('KeyD'); let b2 = await pos();
    ok(T('D moves Bella right, Ralph still'), b2[0][0] > a[0][0] + 0.02 && b2[1][0] === a[1][0]);
    a = b2; await p.keyboard.down('KeyW'); await p.waitForTimeout(300); await p.keyboard.up('KeyW'); b2 = await pos();
    ok(T('W moves Bella up'), b2[0][1] < a[0][1] - 0.02);
    a = b2; await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(400); await p.keyboard.up('ArrowLeft'); b2 = await pos();
    ok(T('ArrowLeft moves Ralph left, Bella still'), b2[1][0] < a[1][0] - 0.02 && b2[0][0] === a[0][0]);
    a = b2; await p.keyboard.down('ArrowDown'); await p.waitForTimeout(300); await p.keyboard.up('ArrowDown'); b2 = await pos();
    ok(T('ArrowDown moves Ralph down'), b2[1][1] > a[1][1] + 0.02);
    // touch buttons via pointer events (distinct pointer ids, held simultaneously)
    const ptr = (sel, type, id) => p.$eval(sel, (el, [type, id]) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true, clientX: r.x + 5, clientY: r.y + 5, buttons: type === 'pointerdown' ? 1 : 0 })); }, [type, id]);
    a = await pos(); await ptr('#padB .r', 'pointerdown', 11); await ptr('#padR .u', 'pointerdown', 12); await p.waitForTimeout(400);
    await ptr('#padB .r', 'pointerup', 11); await ptr('#padR .u', 'pointerup', 12); b2 = await pos();
    ok(T('multi-touch: Bella pad right + Ralph pad up together'), b2[0][0] > a[0][0] + 0.02 && b2[1][1] < a[1][1] - 0.02 && b2[0][1] === a[0][1] && b2[1][0] === a[1][0]);
    a = b2; await p.waitForTimeout(300); b2 = await pos(); ok(T('release stops movement'), JSON.stringify(a) === JSON.stringify(b2));
    if (name !== 'chromium') { // real tap on iPad emulation
      a = await pos(); await p.tap('#padR .l'); b2 = await pos(); ok(T('tap on Ralph pad does not move Bella'), b2[0][0] === a[0][0]);
    }
    await p.screenshot({ path: `${root}/shots/${name}-play.png` });
    // collect gem: place gem on Ralph
    await p.evaluate(() => { const r = RR.players[1]; RR.gems = [{ x: r.x, y: r.y, c: '#ffe156', b: 0 }]; }); await p.waitForTimeout(150);
    let sc = await p.evaluate(() => RR.players.map(q => q.score)); ok(T('gem on Ralph -> Ralph 1, Bella 0'), sc[0] === 0 && sc[1] === 1);
    await p.evaluate(() => { const r = RR.players[0]; RR.gems = [{ x: r.x, y: r.y, c: '#ff5c8a', b: 0 }]; }); await p.waitForTimeout(150);
    sc = await p.evaluate(() => RR.players.map(q => q.score)); ok(T('gem on Bella -> Bella 1'), sc[0] === 1 && sc[1] === 1);
    await p.evaluate(() => { RR.players[0].score = 9; const r = RR.players[0]; RR.gems = [{ x: r.x, y: r.y, c: '#7ed957', b: 0 }]; }); await p.waitForTimeout(800);
    ok(T('10th gem shows winner screen'), await p.evaluate(() => RR.state) === 'win' && await p.isVisible('#win') && (await p.textContent('#winText')).includes('Bella'));
    await p.screenshot({ path: `${root}/shots/${name}-win.png` });
    await p.click('#againBtn');
    ok(T('play again resets'), await p.evaluate(() => RR.state === 'play' && RR.players.every(q => q.score === 0) && RR.gems.length === 3) && !(await p.isVisible('#win')));
    ok(T('no console errors'), errs.length === 0 || (out.push('  ' + errs.join(' | ')), false));
    await b.close();
  }
  srv.close();
  const txt = new Date().toString() + '\n' + out.join('\n') + `\n${out.length - fails}/${out.length} passed\n`;
  fs.writeFileSync(`${root}/tests/last-run.txt`, txt); console.log(txt); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(2); });
