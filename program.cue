// Minesweeper, as it shipped with Windows: three level screens over one field
// of squares, and a Hall of Fame. The game is `tab` — it is played in one
// browser tab — Best is `device`, so a record survives a reload, and Score is
// `server`: the one ranking every player shares. The same clicks, seed and
// clock replay the same game.
@extern(embed)

package prontoweeper

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
				// The draw this field was laid from, empty before the first
				// click. It names one game, so a win is posted at most once.
				{ordinal: 12, name: "round", type: "string", cel: "this.matches('^[0-9]{0,10}$')"},
			]
			seed: [for L in _levels {
				id: L.lv, rows: L.rows, cols: L.cols, mines: L.mines, status: "ready", face: "smile"
				left: L.mines, left_led: "0\(L.mines)", time: 0, time_led: "000", t0: 0, round: ""
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
		// The cluster's identities. The auth service writes a guest's row
		// (id, handle) at sign-in; nothing in the app reads it, so no reader
		// may: a score carries the name its player typed.
		AppUser: {
			id: "0xcf5431bbdd3c2cc3"
			table:      "app_user"
			durability: "server"
			access: {scope: "internal"}
			fields: [
				// No default: the auth service supplies the id.
				{ordinal: 1, name: "id", type: "uuid", pk: true},
				{ordinal: 2, name: "handle", type: "string", unique: true, cel: "this.size() > 0"},
			]
		}
		// One posted win: the Hall of Fame every player shares. Anyone reads
		// it; a player inserts only their own rows and changes none, the
		// policies in 011_score_writes.sql (#Access has no "everyone reads,
		// the owner writes" mode).
		Score: {
			id: "0xec8f14b4320f217c"
			table:      "score"
			durability: "server"
			access: {scope: "public"}
			// One post per player per game: a retried or repeated submit is
			// the same row, never a second one.
			uniques: [{name: "uq_score_round", cols: ["user_id", "round"]}]
			fields: [
				{ordinal: 1, name: "id", type: "uuid", pk: true},
				{ordinal: 2, name: "user_id", type: "uuid", ref: "app_user", default: "auth_uid()"},
				{ordinal: 3, name: "level", type: "string", cel: "this in ['b', 'i', 'e']"},
				{ordinal: 4, name: "time", type: "int32", cel: "this >= 1 && this <= 999"},
				{ordinal: 5, name: "name", type: "string", cel: "this.size() >= 1 && this.size() <= 20"},
				{ordinal: 6, name: "round", type: "string", cel: "this.matches('^[0-9]{1,10}$')"},
				{ordinal: 7, name: "created", type: "timestamp", default: "now()"},
			]
		}
		// Who answers the right button. One row, one state: its chart's only
		// arrow is contextmenu, and an arrow for it is what tells the terminal
		// to cancel the browser's own menu over the window.
		RightButton: {
			id: "0xdb7e2ee081412442"
			table:      "right_button"
			durability: "tab"
			fields: [
				{ordinal: 1, name: "id", type: "string", pk: true, cel: "this == 'right'"},
				{ordinal: 2, name: "owner", type: "string", cel: "this in ['game']"},
			]
			seed: [{id: "right", owner: "game"}]
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

	// Guests only: the edge tier signs in guests and no one else, so the
	// terminal mints one silently at boot and nobody meets a login screen.
	// Playing needs no identity; posting a win writes under it.
	state: rawMigrations: [
		// Works around an emitter regression; see the file.
		{name: "010_electric_login.sql", src: "services/database/sql/010_electric_login.sql"},
		{name: "011_score_writes.sql", src: "services/database/sql/011_score_writes.sql"},
	]

	capabilities: {
		auth: {required: false, service: "/auth"}
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
					post: {states: ["populated", "populated"], accepts: ["accept-post-score"]}
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
			// The ranking every player shares, top ten per level.
			halloffame: {
				title: "Hall of Fame", route: "/hall-of-fame", label: "nav_halloffame", keep: 0, strip: false, states: ["populated"]
				files: shared: ["shell/shared/window.css"]
				paths: browse: {states: ["populated", "populated"], accepts: ["accept-hall-of-fame"]}
			}
		}
		handlers: {}
		design: (pronto.#DesignMd & {text: _designMd}).design
		flows: {}
	}

	meta: {
		// The released name: the Worker and its workers.dev address. The
		// window still says Minesweeper.
		name:        "prontoweeper"
		description: "Minesweeper, a homage to the game that shipped with Windows."
		ir: {sha256: "000b205795afa38a6b6bcad266ed5e19e9da4d19ba780570734d477a58eda222"}
		// Cloudflare, not Pages: a ranking shared by everyone needs a cluster
		// every player reaches, and Pages runs a cluster per tab. k8s is the
		// operator's own cluster behind NAT (release.cue).
		targets: ["cloudflare", "k8s"]
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
			"decision-guests": {}
			"decision-score-writes": {}
			"decision-hosting": {}
		}
		tests: {}
	}
}

cluster:  (pronto.#DefaultCluster & {"code": code, "local": terminal.surface.runtime != "", statics: terminal.surface.statics}).out
terminal: (pronto.#DefaultTerminal & {"code": code}).out
loop:     (pronto.#DefaultLoop & {"code": code, "cluster": cluster, "terminal": terminal}).out

// The suite's cases are data (tests/unit/sweep.cue, held to tests/unit/schema.cue), run by
// tests/unit.ts: no unit test is written as code.
loop: surface: checks: "unit": {
	verb: "test"
	cmds: ["deno test --allow-read --allow-env --allow-run tests/unit.ts -- unit"]
	note: "each handler file is a value: evaluated, called with rows and an event, and its updates compared"
}

build: (pronto.#DefaultBuild & {"code": code, "loop": loop, "cluster": cluster, "terminal": terminal}).out
out:   pronto.#emit & {"code": code, "cluster": cluster, "terminal": terminal, "loop": loop, "build": build}
