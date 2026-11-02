package scenarios

// Prontoweeper has no acceptance scenarios of its own. These, which its Unity declaration names
// (unity/unity.json scenarios), are written to the schema the apps share (apps/solitaire/tests/
// scenarios/schema.cue, which the Unity host carries) and run on the Unity host. The field, the clicks,
// the right button and the metronome are the app's (shell/screens/beginner.html, sweep.js,
// clock.js, bump.js); a scenario only says what holds. `?seed=7` lays the same mines every run.

scenarios: {
	"field": {
		accepts: ["accept-field"]
		actors: ana: name: "Ana"
		steps: [
			{by: "ana", open: "/?seed=7"},
			{by: "ana", count: {of: ".field .cell", is: 81}, why: "a Beginner field is nine by nine"},
			{by: "ana", count: {of: ".cell[data-look=hidden]", is: 81}},
			{by: "ana", text: {of: ".status .led", is: "010"}, why: "ten mines left to find"},
			{by: "ana", attr: {of: "#face", name: "data-face", is: "smile"}},
			{by: "ana", shot: "ready"},
		]
	}
	"sweep": {
		accepts: ["accept-sweep"]
		actors: ana: name: "Ana"
		steps: [
			{by: "ana", open: "/?seed=7"},
			{by: "ana", click: "[data-id=b0404]", why: "the first square opened is never a mine"},
			{by: "ana", attr: {of: "[data-id=b0404]", name: "data-look", is: "open"}},
			{by: "ana", count: {of: ".cell[data-look=mine]", is: 0}},
			{by: "ana", count: {of: ".cell[data-look=boom]", is: 0}},
			{by: "ana", count: {of: ".cell[data-look=open]", atLeast: 1}},
			{by: "ana", shot: "opened"},
		]
	}
	"clock": {
		accepts: ["accept-clock"]
		actors: ana: name: "Ana"
		steps: [
			{by: "ana", open: "/?seed=7"},
			{by: "ana", pause: 3, why: "no game yet: the timer holds"},
			{by: "ana", text: {of: ".status .led:last-of-type", is: "000"}},
			{by: "ana", click: "[data-id=b0404]"},
			{by: "ana", text: {of: ".status .led:last-of-type", is: "001"}, why: "the first click starts the clock at one"},
			{by: "ana", pause: 3},
			{by: "ana", text: {of: ".status .led:last-of-type", is: "004"}, why: "the metronome's beats move the timer"},
		]
	}
}
