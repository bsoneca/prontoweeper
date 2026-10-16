// The whole game. A click names its row and nothing else, so the row id is the
// datum: "b0305" is the Beginner square at row 3, column 5, and "b" is the
// Beginner game itself (its face, or New in its Game menu). The field is
// rebuilt from the rows, the gesture is played on it, and only the squares and
// game columns that changed are written back.
//
// Mines are laid after the first click, from a draw the terminal makes
// (`then: {seed: true}`), so the first square opened is never a mine and
// ?seed= replays the same field.
//
// Total over any rows: the battery calls it with generated ones.
(state, event) => {
  const none = { updates: [] };
  if (event.type === "refused") throw new Error(`store refused ${event.entity} (${event.kind})`);
  const rowsOf = (t) => (Array.isArray(state.rows?.[t]) ? state.rows[t] : []);
  // A square's click names its row. The face and New sit in a slot over the
  // game row, whose clicks carry no id: the row is the slot's one item. A
  // draw's re-wake carries neither, only what the click passed in `with`.
  const items = Array.isArray(state.items) ? state.items : [];
  const slot = items.length === 1 ? items[0]?.id : undefined;
  const id = String((event.type === "drawn" ? event.with?.cell : event.id ?? slot) ?? "");
  const lv = id.slice(0, 1);
  const game = rowsOf("game").find((g) => g.id === lv);
  if (game === undefined || !["b", "i", "e"].includes(lv)) return none;

  const rows = Number(game.rows);
  const cols = Number(game.cols);
  const mines = Number(game.mines);
  if (!(rows >= 1 && rows <= 16 && cols >= 1 && cols <= 30 && mines >= 1 && mines < rows * cols)) return none;

  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  const key = (r, c) => `${lv}${pad(r)}${pad(c)}`;
  const LOOKS = ["hidden", "flag", "mark", "open", "boom", "mine", "wrong"];
  const tickN = Number(rowsOf("tick")[0]?.n ?? 0) || 0;
  const t0 = Number(game.t0) || 0;
  const status = ["ready", "playing", "won", "lost"].includes(game.status) ? game.status : "ready";

  // The field as it stands. A square the store lacks starts raised and empty.
  const have = new Map(rowsOf("cell").filter((c) => c.lv === lv).map((c) => [c.id, c]));
  const keys = [];
  const field = new Map();
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const k = key(r, c);
      const h = have.get(k);
      keys.push(k);
      field.set(k, {
        r,
        c,
        mine: h?.mine === "yes" ? "yes" : "no",
        look: LOOKS.includes(h?.look) ? h.look : "hidden",
        n: Math.max(0, Math.min(8, Number(h?.n) || 0)),
      });
    }
  }
  const around = (k) => {
    const s = field.get(k);
    const out = [];
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const r = s.r + dr;
        const c = s.c + dc;
        if ((dr !== 0 || dc !== 0) && r >= 0 && r < rows && c >= 0 && c < cols) out.push(key(r, c));
      }
    }
    return out;
  };
  const shut = (s) => s.look === "hidden" || s.look === "mark";

  // Open a square, and every square around one with no mine near it.
  const flood = (start) => {
    const queue = [start];
    while (queue.length > 0) {
      const k = queue.pop();
      const s = field.get(k);
      if (!shut(s) || s.mine === "yes") continue;
      s.look = "open";
      if (s.n === 0) for (const m of around(k)) if (shut(field.get(m))) queue.push(m);
    }
  };
  const lose = (booms) => {
    for (const k of keys) {
      const s = field.get(k);
      if (booms.includes(k)) s.look = "boom";
      else if (s.mine === "yes" && s.look !== "flag") s.look = "mine";
      else if (s.mine === "no" && s.look === "flag") s.look = "wrong";
    }
    return "lost";
  };
  const settle = () => {
    const left = keys.filter((k) => field.get(k).mine === "no" && field.get(k).look !== "open").length;
    if (left > 0) return "playing";
    for (const k of keys) if (field.get(k).mine === "yes") field.get(k).look = "flag";
    return "won";
  };

  let next = status;
  let start = t0;
  const isGame = id === lv;

  if (isGame) {
    if (event.type !== "click") return none;
    for (const k of keys) {
      const s = field.get(k);
      s.mine = "no";
      s.look = "hidden";
      s.n = 0;
    }
    next = "ready";
    start = 0;
  } else {
    const sq = field.get(id);
    if (sq === undefined || status === "won" || status === "lost") return none;
    if (event.type === "contextmenu") {
      const cycle = { hidden: "flag", flag: "mark", mark: "hidden" };
      if (cycle[sq.look] === undefined) return none;
      sq.look = cycle[sq.look];
    } else if (event.type === "click" && status === "ready") {
      if (!shut(sq)) return none;
      return { updates: [], then: { type: "drawn", seed: true, with: { cell: id } } };
    } else if (event.type === "drawn" && status === "ready") {
      // Lay the mines anywhere but the square that was clicked, then count.
      const first = id;
      let a = Number(event.seed) >>> 0;
      const draw = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const pool = keys.filter((k) => k !== first);
      for (let i = 0; i < mines; i += 1) {
        const j = i + Math.floor(draw() * (pool.length - i));
        const pick = pool[j];
        pool[j] = pool[i];
        pool[i] = pick;
        field.get(pick).mine = "yes";
      }
      for (const k of keys) field.get(k).n = around(k).filter((m) => field.get(m).mine === "yes").length;
      start = tickN;
      flood(first);
      next = settle();
    } else if (event.type === "click" && status === "playing") {
      if (shut(sq)) {
        if (sq.mine === "yes") next = lose([id]);
        else {
          flood(id);
          next = settle();
        }
      } else if (sq.look === "open" && sq.n > 0) {
        // The chord: the flags around a number already account for it.
        const near = around(id);
        if (near.filter((m) => field.get(m).look === "flag").length !== sq.n) return none;
        const opened = near.filter((m) => shut(field.get(m)));
        const booms = opened.filter((m) => field.get(m).mine === "yes");
        if (booms.length > 0) next = lose(booms);
        else {
          for (const m of opened) flood(m);
          next = settle();
        }
      } else return none;
    } else return none;
  }

  // Write back what changed.
  const shown = (s) => (s.look === "open" && s.n > 0 ? String(s.n) : s.look === "mark" ? "?" : "");
  const updates = [];
  for (const k of keys) {
    const s = field.get(k);
    const want = { mine: s.mine, look: s.look, n: s.n, shown: shown(s) };
    const h = have.get(k);
    if (h === undefined) updates.push({ op: "put", entity: "cell", id: k, row: { lv, ...want } });
    else {
      const diff = {};
      for (const f of Object.keys(want)) if (String(h[f]) !== String(want[f])) diff[f] = want[f];
      if (Object.keys(diff).length > 0) updates.push({ op: "patch", entity: "cell", id: k, row: diff });
    }
  }

  const led = (v) => (v < 0 ? `-${String(Math.min(99, -v)).padStart(2, "0")}` : String(Math.min(999, v)).padStart(3, "0"));
  // A flag crossed out after a loss still counted as one while it stood.
  const flags = keys.filter((k) => ["flag", "wrong"].includes(field.get(k).look)).length;
  const left = Math.max(-999, mines - flags);
  const time = next === "ready" ? 0 : Math.max(1, Math.min(999, tickN - start + 1));
  const face = { ready: "smile", playing: "smile", won: "cool", lost: "dead" }[next];
  const want = { status: next, face, left, left_led: led(left), time, time_led: led(time), t0: start };
  const diff = {};
  for (const f of Object.keys(want)) if (String(game[f]) !== String(want[f])) diff[f] = want[f];
  if (Object.keys(diff).length > 0) updates.push({ op: "patch", entity: "game", id: lv, row: diff });

  // A win faster than the level's best is the new best; the first win at a
  // level makes its row.
  if (next === "won" && status !== "won") {
    const best = rowsOf("best").find((b) => b.id === lv);
    const level = { b: "beginner", i: "intermediate", e: "expert" }[lv];
    if (best === undefined) updates.push({ op: "put", entity: "best", id: lv, row: { level, time, who: "Anonymous" } });
    else if (time < Number(best.time)) updates.push({ op: "patch", entity: "best", id: lv, row: { time } });
  }
  return { updates };
}
