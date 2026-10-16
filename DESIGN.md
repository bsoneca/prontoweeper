---
preset: "press"
colors:
  neutral: "#008080"
  surface: "#C0C0C0"
  surface-muted: "#BDBDBD"
  border: "#808080"
  primary: "#000000"
  secondary: "#808080"
  accent: "#000080"
  danger: "#FF0000"
  attention: "#FFFF00"
  hilite: "#FFFFFF"
  lowlite: "#808080"
  title-end: "#1084D0"
  title-ink: "#FFFFFF"
  led: "#FF0000"
  led-ground: "#000000"
  n1: "#0000FF"
  n2: "#008000"
  n3: "#FF0000"
  n4: "#000080"
  n5: "#800000"
  n6: "#008080"
  n7: "#000000"
  n8: "#808080"
dark:
  neutral: "#003C3C"
  surface: "#C0C0C0"
  surface-muted: "#BDBDBD"
  border: "#808080"
  primary: "#000000"
  secondary: "#808080"
  accent: "#000080"
  danger: "#FF0000"
  attention: "#FFFF00"
  hilite: "#FFFFFF"
  lowlite: "#808080"
  title-end: "#1084D0"
  title-ink: "#FFFFFF"
  led: "#FF0000"
  led-ground: "#000000"
  n1: "#0000FF"
  n2: "#008000"
  n3: "#FF0000"
  n4: "#000080"
  n5: "#800000"
  n6: "#008080"
  n7: "#000000"
  n8: "#808080"
shell:
  bg: "neutral"
  fg: "title-ink"
  rule: "border"
control:
  cell: "24px"
  led-w: "41px"
  led-h: "25px"
  face: "36px"
---

# Windows 95, grey on teal

The identity is the original's, as close as a browser can draw it: the
system grey `#C0C0C0` lit from the top left — a white edge above and left, a
`#808080` edge below and right — standing on the teal desktop.

- **Bevels are the whole vocabulary.** A raised square, the face button and
  the window frame are lit from the top left; the field, the counters and the
  status panel are sunk into it, the same two edges swapped. A pressed square
  loses its bevel and lies flat, exactly as an opened one does, with a single
  grey hairline between neighbours.
- **The counters are a calculator's LEDs**: three red digits on black, in a
  monospaced figure, the mine counter on the left and the timer on the right.
- **The numbers keep their colours** — 1 blue, 2 green, 3 red, 4 navy, 5
  maroon, 6 teal, 7 black, 8 grey — because a player reads the colour before
  the digit.
- **The title bar is the navy of Windows 95**, running out to the lighter blue
  that 98 added, with white bold type.
- **Squares are 24px**, one and a half times the original's 16, so a finger
  or a modern pointer finds them; every edge scales with them.

## The terminal's own words

Once a player is a guest, the terminal draws their handle and "sign out" on
the desktop above the window. They are set in the title bar's white, the way
Windows 95 labelled the icons on its desktop, so they read on both teals.

## The dark twin

Windows 95 had no dark appearance, and a homage that redrew the window for
one would not be a homage. The window stays the window; only the desktop
behind it goes to a deep teal, the way a monitor's brightness knob would.

## Motion

None. The original drew every change at once, and so does this.
