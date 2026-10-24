# Rainbow Realm – design notes

## v1 (now)
- Single `index.html`, canvas + plain JS, no libraries.
- Pastel sky, rainbow arcs, drifting clouds, twinkling sparkles.
- Bella (pink bunny ears, purple, star) and Ralph (blue, green ears, leaf) drawn in code.
- 3 gems on screen at a time; touch one to collect it and a new one pops up somewhere else.
- First to 10 wins → celebration screen with confetti + "Play again".
- Controls: keyboard (Bella WASD, Ralph arrows) and two big on-screen d-pads,
  tracked per pointer id so both kids can press at the same time.
- iPad: pointer events, `touch-action: none`, no pinch/double-tap zoom, resizes for landscape + portrait.
- Tests: `node tests/play.js` (Playwright, WebKit iPad landscape/portrait + Chromium). Results in `tests/last-run.txt`.

## Next steps (one at a time, tested each time)
1. Sounds: a gentle "ding" for each gem and a happy tune for the winner (with a mute button).
2. More gem types: big rainbow gem worth 3, tiny fast-twinkling gems.
3. Rainbow power-ups: speedy shoes, gem magnet, bubble that floats you.
4. 1-player mode vs a gentle, slow computer friend.
5. Levels: cloud land, candy meadow, starry night — with friendly obstacles to walk around.
6. Choose your colours / hats for Bella and Ralph.
7. Archer & Astrid ideas: ask them what Bella and Ralph should find next! (pets? a unicorn friend?)
