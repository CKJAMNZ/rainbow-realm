// node tests/play.js [url]  (serves this folder itself unless a url is given)
const { chromium, webkit, devices } = require('/workspace/pwt/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(fs.readFileSync(path.join(root, 'index.html'))); }).listen(8777);
const out = []; let fails = 0;
const ok = (n, c) => { out.push((c ? 'PASS ' : 'FAIL ') + n); if (!c) fails++; };
(async () => {
  for (const [name, bt, ctxOpt] of [['webkit-ipad', webkit, devices['iPad (gen 7) landscape']], ['webkit-ipad-portrait', webkit, devices['iPad (gen 7)']], ['webkit-iphone13', webkit, devices['iPhone 13']], ['chromium-iphone13', chromium, devices['iPhone 13']], ['chromium', chromium, { viewport: { width: 1280, height: 800 } }]]) {
    const b = await bt.launch(), p = await (await b.newContext(ctxOpt)).newPage(), errs = [];
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    const T = s => name + ': ' + s;
    await p.goto(process.argv[2] || 'http://localhost:8777/'); await p.waitForTimeout(400);
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
    if (name.startsWith('webkit')) { // real tap on iPad emulation
      a = await pos(); await p.tap('#padR .l'); b2 = await pos(); ok(T('tap on Ralph pad does not move Bella'), b2[0][0] === a[0][0]);
    }
    await p.screenshot({ path: `${root}/shots/${name}-play.png` });
    // ---- drag-to-move ----
    const pe = (type, id, x, y) => p.evaluate(([type, id, x, y]) => { const el = document.elementFromPoint(x, y) || document.body; el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 21, bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 })); }, [type, id, x, y]);
    const px = () => p.evaluate(() => RR.players.map(q => [q.x * innerWidth, q.y * innerHeight]));
    const vw = await p.evaluate(() => [innerWidth, innerHeight]);
    const dragTo = async (id, from, to) => { await pe('pointerdown', id, from[0] + 3, from[1] + 3); for (let i = 1; i <= 6; i++) { await pe('pointermove', id, from[0] + (to[0] - from[0]) * i / 6, from[1] + (to[1] - from[1]) * i / 6); await p.waitForTimeout(60); } await p.waitForTimeout(500); };
    await p.evaluate(() => { RR.players[0].x = 0.3; RR.players[1].x = 0.7; RR.players.forEach(q => q.y = 0.45); });
    let P0 = await px(); await dragTo(21, P0[0], [vw[0] * 0.4, vw[1] * 0.3]);
    ok(T('Bella held shows held state'), await p.evaluate(() => RR.players[0].held === 21));
    await p.screenshot({ path: `${root}/shots/${name}-drag.png` });
    await pe('pointerup', 21, vw[0] * 0.4, vw[1] * 0.3); let P1 = await px();
    ok(T('drag moves Bella only'), Math.abs(P1[0][0] - vw[0] * 0.4) < 6 && Math.abs(P1[0][1] - vw[1] * 0.3) < 6 && P1[1][0] === P0[1][0] && P1[1][1] === P0[1][1]);
    await p.waitForTimeout(200); ok(T('drop releases Bella'), JSON.stringify(await px()) === JSON.stringify(P1) && await p.evaluate(() => RR.players[0].held === undefined));
    P0 = await px(); await dragTo(22, P0[1], [vw[0] * 0.75, vw[1] * 0.6]); await pe('pointerup', 22, 0, 0); P1 = await px();
    ok(T('drag moves Ralph only'), Math.abs(P1[1][0] - vw[0] * 0.75) < 6 && P1[0][0] === P0[0][0]);
    // two at once
    P0 = await px(); await pe('pointerdown', 31, P0[0][0], P0[0][1]); await pe('pointerdown', 32, P0[1][0], P0[1][1]);
    const steal = await p.evaluate(() => [RR.players[0].held, RR.players[1].held]);
    for (let i = 1; i <= 6; i++) { await pe('pointermove', 31, P0[0][0], P0[0][1] + vw[1] * 0.05 * i / 6); await pe('pointermove', 32, P0[1][0] - vw[0] * 0.05 * i / 6, P0[1][1]); await p.waitForTimeout(60); }
    await p.waitForTimeout(400); await pe('pointerup', 31, 0, 0); await pe('pointerup', 32, 0, 0); P1 = await px();
    ok(T('two simultaneous drags'), steal[0] === 31 && steal[1] === 32 && P1[0][1] > P0[0][1] + vw[1] * 0.04 && P1[1][0] < P0[1][0] - vw[0] * 0.04);
    // can't steal / one finger can't grab both
    await p.evaluate(() => { RR.players[0].x = RR.players[1].x = 0.5; RR.players[0].y = RR.players[1].y = 0.45; });
    await pe('pointerdown', 41, vw[0] * 0.5, vw[1] * 0.45); await pe('pointerdown', 42, vw[0] * 0.5, vw[1] * 0.45); await pe('pointerdown', 43, vw[0] * 0.5, vw[1] * 0.45);
    const h = await p.evaluate(() => RR.players.map(q => q.held)); for (const i of [41, 42, 43]) await pe('pointerup', i, 0, 0);
    ok(T('one finger grabs one character; held one cannot be stolen'), h[0] !== h[1] && h.every(v => v === 41 || v === 42) && !h.includes(43));
    // drag starting on a button (character sitting on it) does not press the button
    const br = await p.$eval('#padR .l', el => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await p.evaluate(([x, y]) => { RR.players[1].x = x / innerWidth; RR.players[1].y = Math.min(0.92, y / innerHeight); RR.players[0].x = 0.2; RR.players[0].y = 0.3; }, br);
    P0 = await px(); await pe('pointerdown', 51, P0[1][0], P0[1][1]);
    const onBtn = await p.evaluate(() => document.querySelector('#padR .l').classList.contains('on') || Object.keys(RR.players[1].touch).length > 0);
    await p.waitForTimeout(300); P1 = await px(); await pe('pointerup', 51, 0, 0);
    ok(T('drag near/on button does not press button'), !onBtn && Math.abs(P1[1][0] - P0[1][0]) < 2);
    // gem via drag
    const sc0 = await p.evaluate(() => { RR.gems = [{ x: 0.5, y: 0.4, c: '#ffe156', b: 0 }]; RR.players[0].score = 0; RR.players[1].score = 0; return 0; });
    P0 = await px(); await dragTo(61, P0[0], [vw[0] * 0.5, vw[1] * 0.4]); await pe('pointerup', 61, 0, 0);
    ok(T('gem collected via drag scores for Bella'), (await p.evaluate(() => RR.players.map(q => q.score))).join() === '1,0');
    // buttons + keys still work after drags
    await p.evaluate(() => { RR.gems = []; RR.players[0].x = 0.3; RR.players[1].x = 0.7; RR.players.forEach(q => q.y = 0.45); });
    P0 = await p.evaluate(() => RR.players.map(q => [q.x, q.y])); await ptr('#padB .r', 'pointerdown', 71); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(300); await ptr('#padB .r', 'pointerup', 71); await p.keyboard.up('ArrowUp');
    P1 = await p.evaluate(() => RR.players.map(q => [q.x, q.y]));
    ok(T('button + keys still work after drags'), P1[0][0] > P0[0][0] + 0.01 && P1[1][1] < P0[1][1] - 0.01);
    await p.evaluate(() => { RR.players[0].score = 0; RR.players[1].score = 0; });
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
