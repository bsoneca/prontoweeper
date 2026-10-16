# Acceptance

- [ ] Opening the app shows a Beginner field of 81 raised squares, the counter at 010, the timer at 000 and a smiling face. {#accept-ready}
- [ ] The first click never opens a mine, and opening a square with no mine around it opens the whole empty region around it. {#accept-first-click}
- [ ] An opened square shows how many of its neighbours hold a mine, in that number's colour. {#accept-numbers}
- [ ] Right-clicking a raised square flags it, again marks it with a question mark, again clears it, and the counter follows the flags. {#accept-flag}
- [ ] Clicking an opened number whose flags add up to it opens every other neighbour. {#accept-chord}
- [ ] The timer reads 001 on the first click and counts one a second until the game ends. {#accept-timer}
- [ ] Opening a mine loses: it shows on red, the other mines appear, wrong flags are crossed, the face dies and the field stops answering. {#accept-lose}
- [ ] Opening every square without a mine wins: the mines are flagged, the counter reads 000, the face wears sunglasses and the best time is kept. {#accept-win}
- [ ] Pressing the face, or New in the Game menu, starts a fresh game at that level. {#accept-new-game}
- [ ] The Game menu switches between Beginner, Intermediate and Expert, each its own size and mine count, and each keeps its own game. {#accept-levels}
- [ ] Best Times lists the fastest win at each level, and they are still there after a reload. {#accept-best-times}
