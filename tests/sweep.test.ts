// A handler file is one arrow expression, not a module: evaluating its text
// yields the function, the way the terminal's compartment does. These play
// whole games through `sweep` by applying its updates to rows in memory.
type Row = Record<string, unknown> & { id: string };
type Update = { op: string; entity?: string; id: string; row?: Record<string, unknown> };
type Reply = { updates: Update[]; then?: { type: string; seed?: boolean; with?: Record<string, unknown> } };
type Handler = (state: { items?: unknown[]; rows?: Record<string, unknown[]> }, event: Record<string, unknown>) => Reply;

const load = async (name: string): Promise<Handler> =>
  (0, eval)(await Deno.readTextFile(new URL(`../shell/handlers/${name}.js`, import.meta.url)));

const assertEquals = (actual: unknown, expected: unknown, what = "") => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${what} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

const pad = (n: number) => String(n).padStart(2, "0");
const key = (r: number, c: number) => `b${pad(r)}${pad(c)}`;

// A Beginner world as the seed states it.
const world = () => {
  const cell: Row[] = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cell.push({ id: key(r, c), lv: "b", mine: "no", look: "hidden", n: 0, shown: "" });
  return {
    cell,
    game: [{ id: "b", rows: 9, cols: 9, mines: 10, status: "ready", face: "smile", left: 10, left_led: "010", time: 0, time_led: "000", t0: 0, round: "" }] as Row[],
    tick: [{ id: "tick", n: 40, beat: "on" }] as Row[],
    best: [] as Row[],
  };
};
type World = ReturnType<typeof world>;

const apply = (w: World, updates: Update[]) => {
  for (const u of updates) {
    const table = w[(u.entity ?? "cell") as keyof World];
    const row = table.find((x) => x.id === u.id);
    if (u.op === "patch" && row) Object.assign(row, u.row);
    else if (u.op === "put") table.push({ id: u.id, ...u.row });
    else throw new Error(`unexpected ${u.op} ${u.id}`);
  }
};

// Plays one event, following a requested draw with the given seed.
const play = (sweep: Handler, w: World, event: Record<string, unknown>, seed = 12345) => {
  const reply = sweep({ rows: w }, event);
  apply(w, reply.updates);
  if (reply.then?.seed) {
    // As the terminal re-wakes it: the draw and `with`, and no row id.
    const next = sweep({ rows: w }, { type: reply.then.type, seed, with: reply.then.with });
    apply(w, next.updates);
  }
};
const at = (w: World, id: string) => w.cell.find((c) => c.id === id)!;
const game = (w: World) => w.game[0];

// A hand-laid field: mines where `layout` says, counts computed.
const laid = (mines: string[]) => {
  const w = world();
  for (const c of w.cell) c.mine = mines.includes(c.id) ? "yes" : "no";
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && mines.includes(key(r + dr, c + dc))) n++;
      at(w, key(r, c)).n = n;
    }
  }
  Object.assign(game(w), { mines: mines.length, left: mines.length, left_led: String(mines.length).padStart(3, "0"), status: "playing", time: 1, time_led: "001", t0: 40, round: "77" });
  return w;
};

Deno.test("the first click asks for a draw and lays no mine yet", async () => {
  const sweep = await load("sweep");
  const reply = sweep({ rows: world() }, { type: "click", id: "b0404", from: "" });
  assertEquals(reply.updates, []);
  assertEquals(reply.then, { type: "drawn", seed: true, with: { cell: "b0404" } });
});

Deno.test("the draw lays ten mines, never under the first square, and opens it", async () => {
  const sweep = await load("sweep");
  for (const seed of [1, 7, 99, 4_000_000_000]) {
    const w = world();
    play(sweep, w, { type: "click", id: "b0404", from: "" }, seed);
    assertEquals(w.cell.filter((c) => c.mine === "yes").length, 10, `seed ${seed}`);
    assertEquals(at(w, "b0404").mine, "no");
    assertEquals(at(w, "b0404").look, "open");
    assertEquals([game(w).status === "playing" || game(w).status === "won", game(w).time, game(w).time_led, game(w).t0], [true, 1, "001", 40]);
    assertEquals(game(w).round, String(seed >>> 0), "the round names the draw");
    for (const c of w.cell) {
      const r = Number(c.id.slice(1, 3)), k = Number(c.id.slice(3));
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && w.cell.find((x) => x.id === key(r + dr, k + dc))?.mine === "yes") n++;
      assertEquals(c.n, n, `count at ${c.id}`);
      if (c.look === "open") assertEquals(c.shown, n > 0 ? String(n) : "", `shown at ${c.id}`);
    }
  }
});

Deno.test("the same seed lays the same field", async () => {
  const sweep = await load("sweep");
  const a = world(), b = world();
  play(sweep, a, { type: "click", id: "b0000", from: "" }, 2024);
  play(sweep, b, { type: "click", id: "b0000", from: "" }, 2024);
  assertEquals(a.cell.map((c) => c.mine), b.cell.map((c) => c.mine));
});

Deno.test("a square with no mine around it opens its whole empty region", async () => {
  const sweep = await load("sweep");
  const w = laid(["b0808"]);
  play(sweep, w, { type: "click", id: "b0000", from: "" });
  assertEquals(w.cell.filter((c) => c.look !== "open").map((c) => c.id), ["b0808"]);
  assertEquals([game(w).status, game(w).face, game(w).left_led], ["won", "cool", "000"]);
  assertEquals(at(w, "b0808").look, "flag");
});

Deno.test("right-click cycles flag, question mark, raised, and the counter follows the flags", async () => {
  const sweep = await load("sweep");
  const w = laid(["b0000", "b0001"]);
  const looks: unknown[] = [];
  for (let i = 0; i < 3; i++) {
    play(sweep, w, { type: "contextmenu", id: "b0505", from: "" });
    looks.push([at(w, "b0505").look, at(w, "b0505").shown, game(w).left_led]);
  }
  assertEquals(looks, [["flag", "", "001"], ["mark", "?", "002"], ["hidden", "", "002"]]);
  // A flagged square is not opened by a left click.
  play(sweep, w, { type: "contextmenu", id: "b0000", from: "" });
  play(sweep, w, { type: "click", id: "b0000", from: "" });
  assertEquals([at(w, "b0000").look, game(w).status], ["flag", "playing"]);
  // More flags than mines read negative.
  for (const id of ["b0101", "b0202", "b0303"]) play(sweep, w, { type: "contextmenu", id, from: "" });
  assertEquals([game(w).left, game(w).left_led], [-2, "-02"]);
});

Deno.test("opening a mine loses: it goes off, the rest show, wrong flags are crossed", async () => {
  const sweep = await load("sweep");
  const w = laid(["b0000", "b0808", "b0408"]);
  play(sweep, w, { type: "contextmenu", id: "b0808", from: "" }); // right
  play(sweep, w, { type: "contextmenu", id: "b0505", from: "" }); // wrong
  play(sweep, w, { type: "click", id: "b0000", from: "" });
  assertEquals([at(w, "b0000").look, at(w, "b0408").look, at(w, "b0808").look, at(w, "b0505").look], ["boom", "mine", "flag", "wrong"]);
  assertEquals([game(w).status, game(w).face, game(w).left_led], ["lost", "dead", "001"]);
  // The field stops answering.
  const before = JSON.stringify(w);
  play(sweep, w, { type: "click", id: "b0404", from: "" });
  play(sweep, w, { type: "contextmenu", id: "b0404", from: "" });
  assertEquals(JSON.stringify(w), before);
});

Deno.test("a number whose flags add up to it opens the rest of its neighbours", async () => {
  const sweep = await load("sweep");
  const w = laid(["b0000", "b0808"]);
  at(w, "b0101").look = "open";
  at(w, "b0101").shown = "1";
  play(sweep, w, { type: "contextmenu", id: "b0000", from: "" });
  play(sweep, w, { type: "click", id: "b0101", from: "" });
  for (const id of ["b0001", "b0002", "b0100", "b0102", "b0200", "b0201", "b0202"]) assertEquals(at(w, id).look, "open", id);
  // A chord on a wrong flag opens the mine and loses.
  const v = laid(["b0000", "b0808"]);
  at(v, "b0101").look = "open";
  play(sweep, v, { type: "contextmenu", id: "b0001", from: "" });
  play(sweep, v, { type: "click", id: "b0101", from: "" });
  assertEquals([at(v, "b0000").look, at(v, "b0001").look, game(v).status], ["boom", "wrong", "lost"]);
});

Deno.test("a win stops the clock where it was and keeps a better time", async () => {
  const sweep = await load("sweep");
  const w = laid(["b0808"]);
  w.tick[0].n = 40 + 41; // 42 seconds since the first click
  play(sweep, w, { type: "click", id: "b0000", from: "" });
  assertEquals([game(w).status, game(w).time, game(w).time_led], ["won", 42, "042"]);
  assertEquals(w.best, [{ id: "b", level: "beginner", time: 42, who: "Anonymous" }]);
  // A slower win does not replace it.
  const v = laid(["b0808"]);
  v.best.push({ id: "b", level: "beginner", time: 30, who: "Anonymous" });
  v.tick[0].n = 100;
  play(sweep, v, { type: "click", id: "b0000", from: "" });
  assertEquals(v.best[0].time, 30);
});

Deno.test("the face and New reset the level to a fresh field", async () => {
  const sweep = await load("sweep");
  for (const from of ["face", "new"]) {
    const w = laid(["b0000", "b0808"]);
    play(sweep, w, { type: "click", id: "b0000", from: "" });
    // As the terminal sends it from a slot: no id, the game row as the item.
    const reply = sweep({ items: [game(w)], rows: w }, { type: "click", from });
    apply(w, reply.updates);
    assertEquals(w.cell.every((c) => c.mine === "no" && c.look === "hidden" && c.n === 0 && c.shown === ""), true, from);
    assertEquals([game(w).status, game(w).face, game(w).left_led, game(w).time_led, game(w).round], ["ready", "smile", "002", "000", ""]);
  }
});

Deno.test("the clock moves only a game being played, and writes only a change", async () => {
  const clock = await load("clock");
  const games = [
    { id: "b", status: "playing", t0: 10, time: 1 },
    { id: "i", status: "won", t0: 0, time: 7 },
    { id: "e", status: "lost", t0: 3, time: 4 },
  ];
  assertEquals(clock({ items: [{ id: "tick", n: 14 }], rows: { game: games } }, { type: "mutation" }).updates, [
    { op: "patch", entity: "game", id: "b", row: { time: 5, time_led: "005" } },
  ]);
  assertEquals(clock({ items: [{ id: "tick", n: 10 }], rows: { game: [games[0]] } }, { type: "mutation" }).updates, []);
});

Deno.test("sweep is total over rows and events it does not expect", async () => {
  const sweep = await load("sweep");
  const junk = [{}, { type: "click" }, { type: "click", id: "zz" }, { type: "drawn", id: "b0000" }, { type: "keydown", id: "b" }];
  for (const event of junk) {
    sweep({}, event);
    sweep({ rows: world() }, event);
    sweep({ rows: { game: [{ id: "b", rows: "x" }], cell: [{ id: "b0000" }] } }, event);
  }
});
