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

## v1.1 – drag-to-move
- Press on (or near, ~1.6x body radius) Bella or Ralph and drag; release to drop. Gems count while dragging.
- Follow choice: the character glides toward the finger at up to 3x walking speed (capped, so no teleporting
  across the screen – fair for both kids, but still feels snappy). A glowing yellow ring shows while held.
- Each finger grabs at most one character; a held character can't be stolen by another finger.
- Drag wins over buttons: the grab is checked first (capture phase), so a press on a character sitting on a d-pad
  is a drag, and that finger never presses a button. Buttons only react to fingers that started on them.
- Tests cover iPad (landscape/portrait), iPhone 13 (WebKit + Chromium) and desktop Chromium.

## Next steps (one at a time, tested each time)
1. Sounds: a gentle "ding" for each gem and a happy tune for the winner (with a mute button).
2. More gem types: big rainbow gem worth 3, tiny fast-twinkling gems.
3. Rainbow power-ups: speedy shoes, gem magnet, bubble that floats you.
4. 1-player mode vs a gentle, slow computer friend.
5. Levels: cloud land, candy meadow, starry night — with friendly obstacles to walk around.
6. Choose your colours / hats for Bella and Ralph.
7. Archer & Astrid ideas: ask them what Bella and Ralph should find next! (pets? a unicorn friend?)
