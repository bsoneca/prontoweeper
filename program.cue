// Minesweeper, as it shipped with Windows: three level screens over one field
// of squares. Every entity but Best is `tab` — the game is played in one
// browser tab — and Best is `device`, so a record survives a reload. The same
// clicks, seed and clock replay the same game.
@extern(embed)

package minesweeper

import (
	"list"

	pronto "github.com/bonisoft3/pronto"
)

_designMd:   _ @embed(file="DESIGN.md", type=text)
_catalogues: _ @embed(glob="messages/*.json")

// The three sizes of the original Game menu.
_levels: [
	{lv: "b", key: "beginner", rows: 9, cols: 9, mines: 10},
	{lv: "i", key: "intermediate", rows: 16, cols: 16, mines: 40},
	{lv: "e", key: "expert", rows: 16, cols: 30, mines: 99},
]
_pad: [for n in list.Range(0, 30, 1) {[if n < 10 {"0\(n)"}, "\(n)"][0]}]

code: pronto.#App & {
	state: entities: {
		// One row per square of every level. The id is the datum: "b0305" is
		// Beginner's row 3, column 5, so a click on it says which square.
		Cell: {
			id: "0xaf63c2b72fcfda24"
			table:      "cell"
			durability: "tab"
			fields: [
				{ordinal: 1, name: "id", type: "string", pk: true, cel: "this.matches('^[bie][0-9]{4}$')"},
				{ordinal: 2, name: "lv", type: "string", cel: "this in ['b', 'i', 'e']"},
				{ordinal: 3, name: "mine", type: "string", cel: "this in ['no', 'yes']"},
				// What the player sees: raised, flagged, question-marked, opened,
				// and, after a loss, the mine that went off, the mines left
				// hidden and the flags that were wrong.
				{ordinal: 4, name: "look", type: "string", cel: "this in ['hidden', 'flag', 'mark', 'open', 'boom', 'mine', 'wrong']"},
				{ordinal: 5, name: "n", type: "int32", cel: "this >= 0 && this <= 8"},
				// The square's face as text: its count once opened, "?" when
				// marked, nothing otherwise. A template binds columns, so the
				// handler states it.
				{ordinal: 6, name: "shown", type: "string", cel: "this in ['', '1', '2', '3', '4', '5', '6', '7', '8', '?']"},
			]
			seed: list.FlattenN([for L in _levels {
				list.FlattenN([for r in list.Range(0, L.rows, 1) {
					[for c in list.Range(0, L.cols, 1) {
						id: "\(L.lv)\(_pad[r])\(_pad[c])", lv: L.lv, mine: "no", look: "hidden", n: 0, shown: ""
					}]
				}], 1)
			}], 1)
		}
		// One game per level, so switching level keeps each where it was.
		Game: {
			id: "0xb2576b51a1a375de"
			table:      "game"
			durability: "tab"
			fields: [
				{ordinal: 1, name: "id", type: "string", pk: true, cel: "this in ['b', 'i', 'e']"},
				{ordinal: 2, name: "rows", type: "int32", cel: "this >= 1 && this <= 16"},
				{ordinal: 3, name: "cols", type: "int32", cel: "this >= 1 && this <= 30"},
				{ordinal: 4, name: "mines", type: "int32", cel: "this >= 1 && this <= 99"},
				{ordinal: 5, name: "status", type: "string", cel: "this in ['ready', 'playing', 'won', 'lost']"},
				{ordinal: 6, name: "face", type: "string", cel: "this in ['smile', 'cool', 'dead']"},
				// Mines minus flags; negative when there are more flags than mines.
				{ordinal: 7, name: "left", type: "int32", cel: "this >= -999 && this <= 999"},
				// The two counters as their three red digits.
				{ordinal: 8, name: "left_led", type: "string", cel: "this.matches('^(-[0-9]{2}|[0-9]{3})$')"},
				{ordinal: 9, name: "time", type: "int32", cel: "this >= 0 && this <= 999"},
				{ordinal: 10, name: "time_led", type: "string", cel: "this.matches('^[0-9]{3}$')"},
				// The metronome's reading at the first click.
				{ordinal: 11, name: "t0", type: "int32", cel: "this >= 0"},
			]
			seed: [for L in _levels {
				id: L.lv, rows: L.rows, cols: L.cols, mines: L.mines, status: "ready", face: "smile"
				left: L.mines, left_led: "0\(L.mines)", time: 0, time_led: "000", t0: 0
			}]
		}
		// The fastest win at each level, kept across reloads in this browser.
		// The player's own record, so nothing seeds it: the first win at a
		// level creates its row, and until then the screen shows the
		// original's "999 seconds, Anonymous".
		Best: {
			id: "0xda7be0dea7ec91f6"
			table:      "best"
			durability: "device"
			fields: [
				{ordinal: 1, name: "id", type: "string", pk: true, cel: "this in ['b', 'i', 'e']"},
				// The level's message key, so the reader's language names it.
				{ordinal: 2, name: "level", type: "string", cel: "this in ['beginner', 'intermediate', 'expert']"},
				{ordinal: 3, name: "time", type: "int32", cel: "this >= 0 && this <= 999"},
				{ordinal: 4, name: "who", type: "string", cel: "this.size() >= 1 && this.size() <= 32"},
			]
		}
		// The clock the timer reads: one number a machine advances each second.
		Tick: {
			id: "0xa4af84ac49cc02cb"
			table:      "tick"
			durability: "tab"
			fields: [
				{ordinal: 1, name: "id", type: "string", pk: true, cel: "this == 'tick'"},
				{ordinal: 2, name: "n", type: "int32", cel: "this >= 0"},
				{ordinal: 3, name: "beat", type: "string", cel: "this in ['on']"},
			]
			seed: [{id: "tick", n: 0, beat: "on"}]
		}
	}

	capabilities: {
		blobs: false
		hatches: {}
		vendored: {}
	}

	surface: {
		// Each level is the same window over its own rows. keep: 0 so only the
		// level on screen runs a metronome; strip: false because the window's
		// own Game menu is how a level is chosen, as it was.
		screens: {
			beginner: {
				title: "Beginner", route: "/", label: "nav_beginner", keep: 0, strip: false, states: ["populated"]
				files: shared: ["shell/shared/window.css"]
				paths: {
					play: {states: ["populated", "populated"], accepts: ["accept-ready", "accept-first-click", "accept-numbers", "accept-flag", "accept-chord", "accept-timer", "accept-lose", "accept-win", "accept-new-game"]}
					records: {states: ["populated", "populated"], accepts: ["accept-best-times", "accept-levels"]}
				}
			}
			intermediate: {
				title: "Intermediate", route: "/intermediate", label: "nav_intermediate", keep: 0, strip: false, states: ["populated"]
				files: shared: ["shell/shared/window.css"]
				paths: play: {states: ["populated", "populated"], accepts: ["accept-levels"]}
			}
			expert: {
				title: "Expert", route: "/expert", label: "nav_expert", keep: 0, strip: false, states: ["populated"]
				files: shared: ["shell/shared/window.css"]
				paths: play: {states: ["populated", "populated"], accepts: ["accept-levels"]}
			}
		}
		handlers: {}
		design: (pronto.#DesignMd & {text: _designMd}).design
		flows: {}
	}

	meta: {
		name:        "minesweeper"
		description: "Minesweeper, a homage to the game that shipped with Windows."
		ir: {sha256: "eb7d7ea8b065c871c2d18d04952c1d09062c438ad4bbb104bdbdefeb69f3b8ac"}
		targets: ["pages"]
		i18n: {
			default: "en"
			locales: {
				"en": path:    "en"
				"pt-BR": path: "pt-br"
			}
			catalogues: _catalogues
		}
		decisions: {
			"decision-escape-hatches": {}
			"decision-durability": {}
		}
		tests: {}
	}
}

cluster:  (pronto.#DefaultCluster & {"code": code, "local": terminal.surface.runtime != "", statics: terminal.surface.statics}).out
terminal: (pronto.#DefaultTerminal & {"code": code}).out
loop:     (pronto.#DefaultLoop & {"code": code, "cluster": cluster, "terminal": terminal}).out

loop: surface: checks: "unit": {
	verb: "test"
	cmds: ["deno test --allow-read tests/sweep.test.ts"]
	note: "each handler file is a value: evaluated, called with rows and an event, and its updates compared"
}

build: (pronto.#DefaultBuild & {"code": code, "loop": loop, "cluster": cluster, "terminal": terminal}).out
out:   pronto.#emit & {"code": code, "cluster": cluster, "terminal": terminal, "loop": loop, "build": build}
