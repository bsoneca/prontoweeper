// A slot: one of several local stacks on one machine at once, of this app or any other, each on
// ports of its own. The same file in every app with a local stack, copied unchanged. Every stack binds the ports .bayt/process-compose.yaml names: each `${<VAR>_PORT:-<n>}`,
// which a variable moves, and a few the plugins write as literals (the identity broker's front,
// the billing broker, flagd's evaluation, management and sync), which nothing moves. So two stacks
// of the app, from two checkouts, collide, and the second's migrations can land in the first's
// database. A slot moves all of them:
//
//   slot n's ports are 33000 + 100·(n-1) onward: the door (CADDY_DOOR_PORT, and
//   CADDY_TLS_HOST_PORT, which ORIGIN names) first, then each variable by name, then each
//   literal by number. Above the 10000-32767 bayt and pronto-identity hash an app's ports into,
//   below macOS's ephemeral 49152 (integrate@local's fresh ports): 160 slots, none another's,
//   whichever app holds it, since every app's stacks share the one pool.
//
// The stack runs from the slot's own copy of the app (<pool>/slot-<n>/app): every entry a link
// to the checkout's, but .bayt/process-compose.yaml, written with the slot's ports for its
// defaults and its literals. Any verb run there brings its stack up on the slot: integrate@local
// (pronto's integrate-local.ts reads that file), a launch (below), verify@local
// (tests/rehearse.ts, which takes a slot of its own).
//
// The pool: the machine's cores, shared by every app's stacks, as a budget of weight
// (STACK_BUDGET, else the cores less 2: 16 on an 18-core Mac). A holder declares its weight, the
// cores it keeps busy: a plain stack (a launch, integrate@local, the scenarios once) 1, a
// rehearsal (verify@local: three throttled pages, at their bursts, and the stack) 9, so two never
// overlap within the default budget; STACK_WEIGHT=<n> names another.
// One is admitted while the weights held, its own added, stay within the budget (the first
// always is); STACK_SLOTS=<n>, when set, also caps the count. Why these numbers:
// apps/brawl-chess/README.md's "Several stacks at once". A slot is held as <pool>/slot-<n>/pid,
// its weight beside it (STACK_POOL, else /tmp/pronto-stacks). A stack on the app's own ports (a
// plain launch@local) is outside the pool and holds no slot. A slot is taken when its holder is
// gone and nothing answers on its ports (a stack orphaned by a killed holder keeps its slot until
// it is down); STACK_SLOT=<n> asks for one by number and waits for it.
//
//   deno run -A tests/slot.ts <command...>   the command on a slot, in the slot's copy, with
//                                            APP_URL, ORIGIN and every port variable set
//   deno run -A tests/slot.ts launch         the stack itself, as launch@local, until stopped
//   deno run -A tests/slot.ts launch --watch the same, warm: an edit lands without a relaunch
//                                            (watch, below)
//
// Run inside the app's toolchain (mise exec), which has process-compose, as the verbs are.

const app = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const pool = Deno.env.get("STACK_POOL") ?? "/tmp/pronto-stacks";
const budget = Number(Deno.env.get("STACK_BUDGET") ?? Math.max(1, navigator.hardwareConcurrency - 2));
const cap = Number(Deno.env.get("STACK_SLOTS") ?? Infinity);
const asked = Number(Deno.env.get("STACK_SLOT") ?? "0");
const say = (s: string) => console.error(`slot: ${s}`);

export type Slot = { n: number; dir: string; door: number; env: Record<string, string>; release: () => void };

// The slot's ports, from the app's process-compose: the variables and the literals, each its own.
export const layout = (compose: string, n: number) => {
  const base = 33000 + 100 * (n - 1);
  const doors = ["CADDY_DOOR_PORT", "CADDY_TLS_HOST_PORT"];
  const vars = [...new Set([...compose.matchAll(/\$\{([A-Z0-9_]+_PORT):-[0-9]+\}/g)].map((m) => m[1]))].filter((v) => !doors.includes(v)).sort();
  const literals = [...new Set([
    ...compose.matchAll(/[A-Z_]*PORT=([0-9]{4,5})\b/g),
    ...compose.matchAll(/--[a-z-]*port ([0-9]{4,5})\b/g),
    ...compose.matchAll(/(?:localhost|127\.0\.0\.1):([0-9]{4,5})\b/g),
  ].map((m) => Number(m[1])))].sort((a, b) => a - b);
  if (1 + vars.length + literals.length > 100) throw new Error("more than 100 ports in .bayt/process-compose.yaml");
  const ports: Record<string, number> = Object.fromEntries(doors.map((v) => [v, base]));
  vars.forEach((v, i) => ports[v] = base + 1 + i);
  const moved = new Map(literals.map((p, i) => [p, base + 1 + vars.length + i]));
  const text = compose
    .replace(new RegExp(`\\b(${literals.join("|") || "$^"})\\b`, "g"), (p) => String(moved.get(Number(p))))
    .replace(/\$\{([A-Z0-9_]+_PORT):-[0-9]+\}/g, (m, v) => ports[v] ? `\${${v}:-${ports[v]}}` : m);
  return { door: base, ports, moved, text };
};

// The PATH the children get, with mise on it: their commands run through `mise exec`, and without
// it process-compose exits at once. If it isn't on the PATH, the newest (by version, numerically)
// mise-v* that sayt cached has it.
const misePath = (): string => {
  const path = Deno.env.get("PATH") ?? "";
  const has = (dir: string) => { try { return (Deno.statSync(`${dir}/mise`).mode ?? 0) & 0o111; } catch { return 0; } };
  if (path.split(":").some(has)) return path;
  const cache = `${Deno.env.get("HOME")}/Library/Caches/sayt`;
  const version = (name: string) => name.slice(6).split(".").map(Number);
  const newest = (a: string, b: string) => {
    const [x, y] = [version(a), version(b)];
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
    return 0;
  };
  let dirs: string[] = [];
  try { dirs = [...Deno.readDirSync(cache)].map((e) => e.name).filter((n) => /^mise-v[0-9]/.test(n) && has(`${cache}/${n}`)); } catch { /* none cached */ }
  if (!dirs.length) { console.error("mise not found: run ./saytw once, or add mise to PATH"); Deno.exit(1); }
  return `${cache}/${dirs.sort(newest)[0]}:${path}`;
};

const alive = async (pid: number) =>
  pid > 0 && (await new Deno.Command("kill", { args: ["-0", String(pid)], stderr: "null" }).output()).code === 0;
const holder = async (n: number) => Number(await Deno.readTextFile(`${pool}/slot-${n}/pid`).catch(() => "0"));
// The weights a holder declares (the README's measures): a stack, and a rehearsal.
export const weights = { stack: 1, rehearsal: 9 };
// A slot's weight, "<pid> <weight>", its holder's only while the pid is the holder's: a holder
// that wrote none (a slot.ts before weights) weighs a stack.
const weighs = async (n: number, pid: number) => {
  const [p, w] = (await Deno.readTextFile(`${pool}/slot-${n}/weight`).catch(() => "")).split(" ").map(Number);
  return p === pid && w > 0 ? w : weights.stack;
};
// Held when something answers there, on either loopback.
const answers = (port: number) => Promise.all(["127.0.0.1", "::1"].map((hostname) =>
  Deno.connect({ hostname, port }).then((c) => (c.close(), true), () => false))).then((a) => a.some(Boolean));

// The pool's own lock, held only while a slot is chosen; one older than a minute is a crashed
// chooser's.
const choosing = async <T>(f: () => Promise<T>): Promise<T> => {
  const lock = `${pool}/.choosing`;
  for (;;) {
    try { Deno.mkdirSync(lock); break; } catch { /* held */ }
    const age = Date.now() - ((await Deno.stat(lock).catch(() => undefined))?.mtime?.getTime() ?? Date.now());
    if (age > 60_000) await Deno.remove(lock, { recursive: true }).catch(() => {});
    await new Promise((r) => setTimeout(r, 200));
  }
  try { return await f(); } finally { await Deno.remove(lock, { recursive: true }).catch(() => {}); }
};

export const claim = async (pid = Deno.pid, what = Deno.args.join(" "), weight = Number(Deno.env.get("STACK_WEIGHT") ?? weights.stack)): Promise<Slot> => {
  await Deno.mkdir(pool, { recursive: true });
  const compose = await Deno.readTextFile(`${app}/.bayt/process-compose.yaml`);
  let told = "";
  for (const end = Date.now() + 2 * 3600_000; ;) {
    const got = await choosing(async () => {
      let live = 0, used = 0;
      for await (const e of Deno.readDir(pool)) {
        const m = e.name.match(/^slot-([0-9]+)$/);
        const pid = m ? await holder(Number(m[1])) : 0;
        if (m && await alive(pid)) { live++; used += await weighs(Number(m[1]), pid); }
      }
      if (live >= cap) return `${live} stacks up, the cap (STACK_SLOTS=${cap})`;
      if (used && used + weight > budget) return `weight ${used} of ${budget} held, this needs ${weight} (STACK_BUDGET)`;
      const busy: string[] = [];
      for (const n of asked ? [asked] : Array.from({ length: 160 }, (_, i) => i + 1)) {
        if (await alive(await holder(n))) { busy.push(`${n} held by ${await holder(n)}`); continue; }
        const { door, ports, moved, text } = layout(compose, n);
        const held = [];
        for (const p of new Set([...Object.values(ports), ...moved.values()])) if (await answers(p)) held.push(p);
        if (held.length) { busy.push(`${n}'s ports ${held.join(", ")} answer, its stack not down`); continue; }
        const dir = `${pool}/slot-${n}`;
        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(`${dir}/weight`, `${pid} ${weight}`);
        await Deno.writeTextFile(`${dir}/pid`, String(pid));
        await Deno.writeTextFile(`${dir}/owner`, `${pid} ${new Date().toISOString()} ${app} ${what} (weight ${weight})\n`);
        return { n, dir, door, ports, text };
      }
      return `slot ${busy.join("; ")}`;
    });
    if (typeof got !== "string") {
      const { n, dir, door, ports, text } = got;
      // The slot's copy of the app: links to the checkout, but its process-compose.
      const copy = `${dir}/app`;
      await Deno.remove(copy, { recursive: true }).catch(() => {});
      await Deno.mkdir(`${copy}/.bayt`, { recursive: true });
      for await (const e of Deno.readDir(app)) if (e.name !== ".bayt") await Deno.symlink(`${app}/${e.name}`, `${copy}/${e.name}`);
      for await (const e of Deno.readDir(`${app}/.bayt`)) {
        if (e.name !== "process-compose.yaml") await Deno.symlink(`${app}/.bayt/${e.name}`, `${copy}/.bayt/${e.name}`);
      }
      await Deno.writeTextFile(`${copy}/.bayt/process-compose.yaml`, text);
      const url = `https://localhost:${door}`;
      say(`slot ${n}: ${url}, ports ${door}-${door + 99}, weight ${weight} of ${budget}, from ${copy}`);
      // mise reads the copy's .mise.toml, which it trusts as the checkout's.
      const trusted = [Deno.env.get("MISE_TRUSTED_CONFIG_PATHS"), copy].filter(Boolean).join(":");
      const env = { ...Object.fromEntries(Object.entries(ports).map(([k, v]) => [k, String(v)])), ORIGIN: url, APP_URL: url, STACK_SLOT: String(n), PRONTO_GATE_DIR: app, MISE_TRUSTED_CONFIG_PATHS: trusted };
      const release = () => { try { Deno.removeSync(`${dir}/pid`); } catch { /* gone */ } };
      return { n, dir: copy, door, env, release };
    }
    if (got !== told) say(`waiting: ${got}`);
    told = got;
    if (Date.now() > end) throw new Error(`no slot after two hours: ${got}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
};

// process-compose with its API on a socket in the run's own folder, and its log there, so the
// stack can be brought down whole: a launch stopped by a signal can leave its postgres behind.
export const stack = (slot: Slot, run: string) => {
  const pc = (more: string[]) => ["-U", "-u", `${run}/pc.sock`, "-L", `${run}/process-compose.log`, ...more];
  const env = { ...slot.env, MISE_LOCKED: "0", PATH: misePath() };
  const child = new Deno.Command("process-compose", { args: pc(["-f", ".bayt/process-compose.yaml", "up", "--tui=false"]), cwd: slot.dir, env, stdout: "null", stderr: "null" }).spawn();
  let exited = false;
  child.status.then(() => exited = true);
  const down = async () => {
    await new Deno.Command("process-compose", { args: pc(["down"]), cwd: slot.dir, env, stdout: "null", stderr: "null" }).output();
    const stopped = await Promise.race([child.status.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(exited), 60_000))]);
    if (!stopped) { try { child.kill("SIGTERM"); } catch { /* gone */ } await Promise.race([child.status, new Promise((r) => setTimeout(r, 30_000))]); }
  };
  return { child, pc, env, exited: () => exited, down };
};

// The warm stack's dev loop (launch --watch), as `sayt launch --watch` is the docker stack's: a
// service restarts when a path its develop.watch names changes (bayt.<service>.json, from what
// the cluster marks watched: the shell, its screens, handlers and styles, the messages, the
// migrations). The door copies its statics again as it starts, so a reload shows the edit; the
// database runs its migrations again, each idempotent. A CUE file changed runs generate in the
// checkout first; what it writes into a watched path restarts its service; when the stack's
// own definition changed it says to launch again. Nothing is built again.
export const watch = (slot: Slot, pc: (more: string[]) => string[], env: Record<string, string>) => {
  const services = () => {
    const by = new Map<string, Set<string>>();
    for (const e of Deno.readDirSync(`${app}/.bayt`)) {
      const m = e.name.match(/^bayt\.(.+)\.json$/);
      if (!m) continue;
      let list: { path: string }[] = [];
      try { list = JSON.parse(Deno.readTextFileSync(`${app}/.bayt/${e.name}`))?.compose?.develop?.watch ?? []; } catch { continue; }
      for (const w of list) {
        const p = decodeURIComponent(new URL(w.path, `file://${app}/.bayt/`).pathname).replace(/\/$/, "");
        if (!by.has(p)) by.set(p, new Set());
        by.get(p)!.add(m[1]);
      }
    }
    return by;
  };
  let by = services();
  const pcRun = (more: string[]) => new Deno.Command("process-compose", { args: pc(more).filter((a, i, all) => a !== "-L" && all[i - 1] !== "-L"), cwd: slot.dir, env, stdout: "null", stderr: "piped" }).output();
  const mtime = (p: string) => { try { return Deno.statSync(p).mtime?.getTime() ?? 0; } catch { return 0; } };
  // The CUE files generate itself wrote, at the time it left them: an event on one of them,
  // unchanged since, is generate's own, not an edit, so generate never runs itself again.
  const generated = new Map<string, number>();
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = Promise.resolve();
  const apply = (first: number) => busy = busy.then(async () => {
    const paths = [...pending];
    pending.clear();
    if (paths.some((p) => p.endsWith(".cue"))) {
      say("watch: CUE changed, generate");
      const start = Date.now();
      const gen = await new Deno.Command("./saytw", { args: ["generate"], cwd: app, stdout: "null", stderr: "null" }).output();
      const walk = (d: string) => {
        for (const e of Deno.readDirSync(d)) {
          const f = `${d}/${e.name}`;
          if (e.isDirectory && !["node_modules", ".bayt", ".task", "cue.mod", ".git"].includes(e.name)) walk(f);
          else if (e.isFile && e.name.endsWith(".cue") && mtime(f) >= start) generated.set(f, mtime(f));
        }
      };
      walk(app);
      for (const [f, t] of generated) if (pending.has(f) && mtime(f) === t) pending.delete(f);
      if (!gen.success) { say(`watch: generate exited ${gen.code}, the stack left as it was`); return; }
      say(`watch: generate done, ${Date.now() - first} ms after the edit; what it wrote restarts what serves it`);
      // A definition changed is a relaunch (seconds, on a slot): process-compose 1.122's project
      // update lost the database's place in the run order after a restart and took the stack down.
      const { text } = layout(await Deno.readTextFile(`${app}/.bayt/process-compose.yaml`), slot.n);
      if (text !== await Deno.readTextFile(`${slot.dir}/.bayt/process-compose.yaml`)) {
        say("watch: the stack's definition changed (a service, a port or a static added): stop this launch and launch again");
      }
      by = services();
    }
    const restart = new Set<string>();
    for (const p of paths) for (const [w, s] of by) if (p === w || p.startsWith(`${w}/`)) s.forEach((x) => restart.add(x));
    for (const s of restart) {
      const r = await pcRun(["process", "restart", s]);
      say(r.success ? `watch: ${s} restarted, ${Date.now() - first} ms after the edit` : `watch: ${s} failed to restart: ${new TextDecoder().decode(r.stderr).trim()}`);
    }
  }).catch((e) => say(`watch: ${e?.message ?? e}; still watching`));
  // The app's folder, not each file: an editor that saves by rename replaces the file a watch held.
  // Events keep coming while generate runs: what it writes into a watched path restarts its service.
  const watcher = Deno.watchFs(app, { recursive: true });
  say(`watch: ${by.size} paths of ${new Set([...by.values()].flatMap((s) => [...s])).size} services, and the app's CUE`);
  let first = 0;
  (async () => {
    for await (const ev of watcher) {
      if (ev.kind === "access") continue;
      const hit = ev.paths.filter((p) => !p.includes("/.bayt/") && !p.includes("/.task/") && !p.includes("/node_modules/") && !p.includes("/cue.mod/") &&
        (p.endsWith(".cue") ? generated.get(p) !== mtime(p) : [...by.keys()].some((w) => p === w || p.startsWith(`${w}/`))));
      if (!hit.length) continue;
      if (!pending.size) first = Date.now();
      hit.forEach((p) => pending.add(p));
      clearTimeout(timer);
      timer = setTimeout(() => apply(first), 150);
    }
  })().catch((e) => say(`watch: stopped: ${e?.message ?? e}`));
  return () => watcher.close();
};

if (import.meta.main) {
  if (!Deno.args.length) { console.error("usage: deno run -A tests/slot.ts launch [--watch] | <command...>"); Deno.exit(2); }
  const slot = await claim();
  let stopping: (() => Promise<void>) | undefined;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    Deno.addSignalListener(signal, async () => { await stopping?.(); slot.release(); Deno.exit(130); });
  }
  let code: number;
  if (Deno.args[0] === "launch") {
    const tmp = await Deno.makeTempDir({ prefix: "slot." });
    const s = stack(slot, tmp);
    const unwatch = Deno.args.includes("--watch") ? watch(slot, s.pc, s.env) : undefined;
    stopping = async () => { say("the stack going down"); unwatch?.(); await s.down(); };
    say(`the stack coming up at ${slot.env.APP_URL}, its log ${tmp}/process-compose.log; stop it with a signal to ${Deno.pid}`);
    code = (await s.child.status).code;
    if (code === 0) await Deno.remove(tmp, { recursive: true }).catch(() => {});
    else console.error((await Deno.readTextFile(`${tmp}/process-compose.log`).catch(() => "")).split("\n").slice(-40).join("\n"));
  } else {
    const [cmd, ...args] = Deno.args;
    const child = new Deno.Command(cmd, { args, cwd: slot.dir, env: { ...slot.env, PATH: misePath() }, stdin: "inherit", stdout: "inherit", stderr: "inherit" }).spawn();
    // Its own stack comes down on its own signal handler (integrate-local.ts and rehearse.ts have one).
    stopping = async () => { try { child.kill("SIGTERM"); } catch { /* gone */ } await Promise.race([child.status, new Promise((r) => setTimeout(r, 120_000))]); };
    code = (await child.status).code;
  }
  slot.release();
  Deno.exit(code);
}
