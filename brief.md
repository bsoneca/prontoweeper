---
pronto: alpha
name: minesweeper
business: free, nothing to sell — a homage to the game that shipped with Windows
stage: complete single-player game
team: squad
cluster: mecha
terminal: omnishell
loop: sayt
build: bayt
---

# Minesweeper

The game everyone found in the Accessories folder, rebuilt as it was: a grey
window with a navy title bar, a menu bar reading **Game** and **Help**, two red
counters on black either side of a yellow face, and a field of raised grey
squares hiding the mines.

Nobody signs in, and nothing leaves the browser.

## Data

- **Squares** — every square of the field: whether a mine lies under it, how
  many of its eight neighbours hold one, and what the player sees on it now —
  still raised, flagged, marked with a question mark, opened, or, once the game
  is lost, the mine that went off, the mines left hidden and the flags that were
  wrong.
- **The game** — one per level: its size and mine count, whether it is waiting
  for the first click, being played, won or lost, the face, how many mines are
  left to flag and how many seconds have passed.
- **Best times** — the fastest win at each level, kept in this browser.
- **The clock** — one number counting seconds, which the timer reads.

## Screens

One window, three sizes, as the original's Game menu offered them:

- **Beginner** — 9 × 9 squares, 10 mines.
- **Intermediate** — 16 × 16 squares, 40 mines.
- **Expert** — 30 × 16 squares, 99 mines.

Each is the same window. The **Game** menu starts a new game, switches level
with a check beside the current one, and opens **Best Times**. The **Help**
menu opens **About Minesweeper**.

Above the field sit the mine counter on the left, the face in the middle and
the timer on the right, each counter three red digits on black. Pressing the
face starts a new game.

## Behavior

- **The first click is never a mine.** The mines are laid only after the first
  click, never under the square it opened.
- **Opening a square** shows how many neighbours hold a mine, in the original's
  colours: 1 blue, 2 green, 3 red, 4 navy, 5 maroon, 6 teal, 7 black, 8 grey. A
  square with no mine around it opens all its neighbours, and so on outwards,
  as far as the empty region goes.
- **Right-clicking** a raised square plants a flag; again turns it into a
  question mark; again clears it. A flagged square cannot be opened by
  accident. The mine counter is the mines minus the flags, and goes negative
  when there are more flags than mines.
- **Clicking an opened number** whose flags around it already add up to it
  opens every other neighbour at once — the old two-button chord.
- **The timer** starts at one with the first click, counts each second, and
  stops at 999, at a win, or at a loss.
- **Pressing a raised square** shows the face with its mouth open, until the
  button comes up.
- **Losing** is opening a mine: it goes off on red, every other mine shows, a
  flag that was wrong is crossed out, the face dies, and the field stops
  answering until a new game.
- **Winning** is opening every square without a mine: the remaining mines are
  flagged, the counter reads zero, the face puts on sunglasses, and a time
  better than the best at that level becomes the new best.
- **Every level keeps its own game**: switching level and coming back finds the
  game where it was left.

![[acceptance]]

## Out of scope

Custom field sizes, the "Marks (?)" and "Color" toggles of the Game menu,
entering a name for a best time (it is kept as "Anonymous", as it was until
someone typed one), sound, and playing on a phone by long-press.
