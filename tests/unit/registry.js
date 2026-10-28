// What Prontoweeper's cases call (tests/unit.ts): handler the handler files as the terminal's
// compartment evaluates them, probe the measures of probes.js.
import { load } from './probes.js';
import * as probe from './probes.js';

export async function registry(_suite) {
  return { handler: { sweep: await load('sweep'), clock: await load('clock') }, probe };
}
