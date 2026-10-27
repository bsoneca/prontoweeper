package prontoproject

import (
	"github.com/bonisoft3/pronto/distribution"
	terminal "github.com/bonisoft3/pronto/terminals:omnishell"
	"github.com/bonisoft3/pronto/clusters:mecha"
	"github.com/bonisoft3/pronto/builders:bayt"
)

pronto: distribution.#Project & terminal.#Project & mecha.#Project & bayt.#Toolchain// pronto and mecha come from the forks' prereleases, served from public ghcr
// packages, until upstream releases them; every other module from the Central
// Registry. How they are published: forks/README.md at the repository root.
pronto: mise: env: CUE_REGISTRY: "github.com/bonisoft3/pronto=ghcr.io/bsoneca/cue-modules,github.com/bonisoft3/mecha=ghcr.io/bsoneca/cue-modules,registry.cue.works"
