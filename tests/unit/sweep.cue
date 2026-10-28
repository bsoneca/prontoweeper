// The handler files (shell/handlers/sweep.js, clock.js) as values: evaluated, called with rows
// and an event, their updates compared. Whole games are played through `sweep` by applying its
// updates to rows in memory (probe.play), on a Beginner world as the seed states it
// (probe.world) or a field laid by hand and being played (probe.laid).
package unit

import "list"

_click: {type: "click", from: ""}
_flag: {type: "contextmenu", from: ""}
_playing: {id: "b", status: "playing", t0: 10, time: 1}
// Events and rows sweep does not expect.
_junk: [{}, {type: "click"}, {type: "click", id: "zz"}, {type: "drawn", id: "b0000"}, {type: "keydown", id: "b"}]

cases: {
	"the first click asks for a draw and lays no mine yet": {suite: "unit", steps: [
		{call: "probe.world"}, {call: "handler.sweep", args: [{rows: "$"}, _click & {id: "b0404"}]}, {keep: "reply"},
		{get: "updates", expect: []},
		{use: "reply"}, {get: "then", expect: {type: "drawn", seed: true, with: {cell: "b0404"}}},
	]}
	"the draw lays ten mines, never under the first square, and opens it": {suite: "unit", steps: list.Concat([for seed in [1, 7, 99, 4000000000] {[
		{call: "probe.world"}, {call: "probe.play", args: ["$", _click & {id: "b0404"}, seed]}, {keep: "w"},
		{call: "probe.mines", args: ["$"], expect: 10, why: "seed \(seed)"},
		{call: "probe.cell", args: ["$w", "b0404"]}, {pick: ["mine", "look"], expect: ["no", "open"]},
		{call: "probe.includes", args: [["playing", "won"], "$w.game.0.status"], expect: true},
		{use: "w"}, {pick: ["game.0.time", "game.0.time_led", "game.0.t0"], expect: [1, "001", 40]},
		{use: "w"}, {get: "game.0.round", expect: "\(seed)", why: "the round names the draw"},
		{call: "probe.countsAmiss", args: ["$w"], expect: [], why: "each count its neighbouring mines, each open square showing it"},
	]}])
	}
	"the same seed lays the same field": {suite: "unit", steps: [
		{call: "probe.world"}, {call: "probe.play", args: ["$", _click & {id: "b0000"}, 2024]}, {get: "cell"}, {map: {get: "mine"}}, {keep: "a"},
		{call: "probe.world"}, {call: "probe.play", args: ["$", _click & {id: "b0000"}, 2024]}, {get: "cell"}, {map: {get: "mine"}, expect: "$a"},
	]}
	"a square with no mine around it opens its whole empty region": {suite: "unit", steps: [
		{call: "probe.laid", args: [["b0808"]]}, {call: "probe.play", args: ["$", _click & {id: "b0000"}]}, {keep: "w"},
		{get: "cell"}, {call: "probe.except", args: ["$", "look", "open"]}, {map: {get: "id"}, expect: ["b0808"]},
		{use: "w"}, {pick: ["game.0.status", "game.0.face", "game.0.left_led"], expect: ["won", "cool", "000"]},
		{call: "probe.cell", args: ["$w", "b0808"]}, {get: "look", expect: "flag"},
	]}
	"right-click cycles flag, question mark, raised, and the counter follows the flags": {suite: "unit", steps: list.Concat([
		[{call: "probe.laid", args: [["b0000", "b0001"]]}, {keep: "w"}],
		for want in [["flag", "", "001"], ["mark", "?", "002"], ["hidden", "", "002"]] {[
			{call: "probe.play", args: ["$w", _flag & {id: "b0505"}]}, {keep: "w"},
			{call: "probe.cell", args: ["$", "b0505"]}, {pick: ["look", "shown"], expect: [want[0], want[1]]},
			{use: "w"}, {get: "game.0.left_led", expect: want[2]},
		]},
		[
			{call: "probe.plays", args: ["$w", [_flag & {id: "b0000"}, _click & {id: "b0000"}]]}, {keep: "w"},
			{pick: ["game.0.status"], expect: ["playing"], why: "a flagged square is not opened by a left click"},
			{call: "probe.cell", args: ["$w", "b0000"]}, {get: "look", expect: "flag"},
			{call: "probe.plays", args: ["$w", [for id in ["b0101", "b0202", "b0303"] {_flag & {"id": id}}]]},
			{pick: ["game.0.left", "game.0.left_led"], expect: [-2, "-02"], why: "more flags than mines read negative"},
		],
	])
	}
	"opening a mine loses: it goes off, the rest show, wrong flags are crossed": {suite: "unit", steps: [
		{call: "probe.laid", args: [["b0000", "b0808", "b0408"]]},
		{call: "probe.plays", args: ["$", [_flag & {id: "b0808"}, _flag & {id: "b0505"}, _click & {id: "b0000"}]], why: "a right flag, a wrong one, then the mine"}, {keep: "w"},
		{call: "probe.looks", args: ["$", ["b0000", "b0408", "b0808", "b0505"]], expect: ["boom", "mine", "flag", "wrong"]},
		{use: "w"}, {pick: ["game.0.status", "game.0.face", "game.0.left_led"], expect: ["lost", "dead", "001"]},
		{call: "probe.plays", args: ["$w", [_click & {id: "b0404"}, _flag & {id: "b0404"}]], expect: "$w", why: "the field stops answering"},
	]}
	"a number whose flags add up to it opens the rest of its neighbours": {suite: "unit", steps: [
		{call: "probe.laid", args: [["b0000", "b0808"]]}, {call: "probe.patched", args: ["$", "cell", "b0101", {look: "open", shown: "1"}]},
		{call: "probe.plays", args: ["$", [_flag & {id: "b0000"}, _click & {id: "b0101"}]]},
		{call: "probe.looks", args: ["$", ["b0001", "b0002", "b0100", "b0102", "b0200", "b0201", "b0202"]], expect: ["open", "open", "open", "open", "open", "open", "open"]},
		{call: "probe.laid", args: [["b0000", "b0808"]]}, {call: "probe.patched", args: ["$", "cell", "b0101", {look: "open"}]},
		{call: "probe.plays", args: ["$", [_flag & {id: "b0001"}, _click & {id: "b0101"}]]}, {keep: "v"},
		{call: "probe.looks", args: ["$", ["b0000", "b0001"]], expect: ["boom", "wrong"], why: "a chord on a wrong flag opens the mine"},
		{use: "v"}, {get: "game.0.status", expect: "lost", why: "and loses"},
	]}
	"a win stops the clock where it was and keeps a better time": {suite: "unit", steps: [
		{call: "probe.laid", args: [["b0808"]]}, {call: "probe.patched", args: ["$", "tick", "tick", {n: 81}], why: "42 seconds since the first click"},
		{call: "probe.play", args: ["$", _click & {id: "b0000"}]}, {keep: "w"},
		{pick: ["game.0.status", "game.0.time", "game.0.time_led"], expect: ["won", 42, "042"]},
		{use: "w"}, {get: "best", expect: [{id: "b", level: "beginner", time: 42, who: "Anonymous"}]},
		{call: "probe.laid", args: [["b0808"]]}, {call: "probe.put", args: ["$", "best", {id: "b", level: "beginner", time: 30, who: "Anonymous"}]},
		{call: "probe.patched", args: ["$", "tick", "tick", {n: 100}]},
		{call: "probe.play", args: ["$", _click & {id: "b0000"}]}, {get: "best.0.time", expect: 30, why: "a slower win does not replace it"},
	]}
	"the face and New reset the level to a fresh field": {suite: "unit", steps: list.Concat([for from in ["face", "new"] {[
		{call: "probe.laid", args: [["b0000", "b0808"]]}, {call: "probe.play", args: ["$", _click & {id: "b0000"}]},
		{call: "probe.fromSlot", args: ["$", from]}, {keep: "w"},
		{call: "probe.notFresh", args: ["$"], expect: [], why: from},
		{use: "w"}, {pick: ["game.0.status", "game.0.face", "game.0.left_led", "game.0.time_led", "game.0.round"], expect: ["ready", "smile", "002", "000", ""]},
	]}])
	}
	"the clock moves only a game being played, and writes only a change": {suite: "unit", steps: [
		{call: "handler.clock", args: [{items: [{id: "tick", n: 14}], rows: game: [_playing, {id: "i", status: "won", t0: 0, time: 7}, {id: "e", status: "lost", t0: 3, time: 4}]}, {type: "mutation"}]},
		{get: "updates", expect: [{op: "patch", entity: "game", id: "b", row: {time: 5, time_led: "005"}}]},
		{call: "handler.clock", args: [{items: [{id: "tick", n: 10}], rows: game: [_playing]}, {type: "mutation"}]},
		{get: "updates", expect: []},
	]}
	"sweep is total over rows and events it does not expect": {suite: "unit", steps: [
		{value: _junk}, {map: {call: "handler.sweep", args: [{}, "$"]}},
		{call: "probe.world"}, {keep: "w"},
		{value: _junk}, {map: {call: "handler.sweep", args: [{rows: "$w"}, "$"]}},
		{value: _junk}, {map: {call: "handler.sweep", args: [{rows: {game: [{id: "b", rows: "x"}], cell: [{id: "b0000"}]}}, "$"]}},
	]}
}
