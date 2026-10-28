// What a unit case (tests/unit/*.cue) calls when a check plays whole games through `sweep` or
// sweeps a field rather than one input and its answer. A world is the rows in memory; playing
// an event applies the handler's updates to a copy of it and returns the copy, so a case can
// keep a world and compare. The cases say what holds; these say how it is looked at.

// A handler file is one arrow expression, not a module: evaluating its text yields the
// function, the way the terminal's compartment does.
export const load = async (name) => (0, eval)(await Deno.readTextFile(new URL(`../../shell/handlers/${name}.js`, import.meta.url)));
const sweepOf = load('sweep');

const pad = (n) => String(n).padStart(2, '0');
const key = (r, c) => `b${pad(r)}${pad(c)}`;
const around = (w, id) => {
  const r = Number(id.slice(1, 3)), k = Number(id.slice(3)), out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) out.push(key(r + dr, k + dc));
  return out.map((x) => w.cell.find((c) => c.id === x)).filter(Boolean);
};

// ---------- worlds ----------
// A Beginner world as the seed states it.
export function world() {
  const cell = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cell.push({ id: key(r, c), lv: 'b', mine: 'no', look: 'hidden', n: 0, shown: '' });
  return {
    cell,
    game: [{ id: 'b', rows: 9, cols: 9, mines: 10, status: 'ready', face: 'smile', left: 10, left_led: '010', time: 0, time_led: '000', t0: 0, round: '' }],
    tick: [{ id: 'tick', n: 40, beat: 'on' }],
    best: [],
  };
}
// A hand-laid field, being played: mines where the list says, counts computed.
export function laid(mines) {
  const w = world();
  for (const c of w.cell) c.mine = mines.includes(c.id) ? 'yes' : 'no';
  for (const c of w.cell) c.n = around(w, c.id).filter((x) => mines.includes(x.id)).length;
  Object.assign(w.game[0], { mines: mines.length, left: mines.length, left_led: String(mines.length).padStart(3, '0'), status: 'playing', time: 1, time_led: '001', t0: 40, round: '77' });
  return w;
}
function apply(w, updates) {
  for (const u of updates) {
    const table = w[u.entity ?? 'cell'];
    const row = table.find((x) => x.id === u.id);
    if (u.op === 'patch' && row) Object.assign(row, u.row);
    else if (u.op === 'put') table.push({ id: u.id, ...u.row });
    else throw new Error(`unexpected ${u.op} ${u.id}`);
  }
  return w;
}
// The world after one event, a requested draw followed with the seed as the terminal re-wakes
// it: the draw and `with`, and no row id.
export async function play(w, event, seed = 12345) {
  const sweep = await sweepOf, next = structuredClone(w);
  const reply = sweep({ rows: next }, event);
  apply(next, reply.updates);
  if (reply.then?.seed) apply(next, sweep({ rows: next }, { type: reply.then.type, seed, with: reply.then.with }).updates);
  return next;
}
export async function plays(w, events, seed) {
  for (const e of events) w = await play(w, e, seed);
  return w;
}
// The world after a click sent from a slot, as the terminal sends it: no id, the game row as
// the item.
export async function fromSlot(w, from) {
  const sweep = await sweepOf, next = structuredClone(w);
  return apply(next, sweep({ items: [next.game[0]], rows: next }, { type: 'click', from }).updates);
}
// The world with a row of a table patched, or one put.
export const patched = (w, entity, id, patch) => {
  const next = structuredClone(w);
  Object.assign(next[entity].find((x) => x.id === id), patch);
  return next;
};
export const put = (w, entity, row) => ({ ...structuredClone(w), [entity]: [...w[entity], row] });

// ---------- reading a field ----------
export const cell = (w, id) => w.cell.find((c) => c.id === id);
export const looks = (w, ids) => ids.map((id) => cell(w, id).look);
export const mines = (w) => w.cell.filter((c) => c.mine === 'yes').length;
// Each square whose count is not its neighbouring mines, or that is open and shows other than
// its count (blank for none).
export const countsAmiss = (w) => w.cell.filter((c) => {
  const n = around(w, c.id).filter((x) => x.mine === 'yes').length;
  return c.n !== n || (c.look === 'open' && c.shown !== (n > 0 ? String(n) : ''));
}).map((c) => c.id);
// Each square not as a fresh field has it: no mine, raised, no count, nothing shown.
export const notFresh = (w) => w.cell.filter((c) => !(c.mine === 'no' && c.look === 'hidden' && c.n === 0 && c.shown === '')).map((c) => c.id);

// ---------- lists, for the cases' steps ----------
export const includes = (list, x) => list.includes(x);
export const except = (list, field, value) => list.filter((x) => x[field] !== value);
