// A fold over the metronome: each beat recomputes every game being played as
// the seconds since its first click, and writes only a timer that moved. A
// game that is won, lost or not yet started keeps the time it has.
(state, event) => {
  if (event.type === "refused") throw new Error(`store refused ${event.entity} (${event.kind})`);
  const n = Number((state.items ?? [])[0]?.n ?? 0) || 0;
  const games = Array.isArray(state.rows?.game) ? state.rows.game : [];
  const updates = [];
  for (const g of games) {
    if (g.status !== "playing") continue;
    const time = Math.max(1, Math.min(999, n - (Number(g.t0) || 0) + 1));
    if (Number(g.time) === time) continue;
    updates.push({ op: "patch", entity: "game", id: g.id, row: { time, time_led: String(time).padStart(3, "0") } });
  }
  return { updates };
}
