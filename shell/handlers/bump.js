// The metronome's one arrow: the beat after this one. It is the only place in
// the app that knows a second passed.
(state, event) => Number(state.items?.[0]?.n ?? 0) + 1
