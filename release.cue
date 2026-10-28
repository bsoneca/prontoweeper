// Where prontoweeper runs besides Cloudflare: release@k8s on a cluster of the
// operator's own, k3s behind NAT, its door the `home` Cloudflare Tunnel and its
// images built in pronto-metal's Cloud Build (pronto's k8s/README.md#12).
package prontoweeper

import (
	"github.com/bonisoft3/pronto/k8s/schema"
	"github.com/bonisoft3/pronto/k8s/envs"
)

App: schema.#ReleaseSpec & {
	name: "prontoweeper"
	gateway: host: "minesweeper.bsoneca.com"
	// The door sends its rendered routes to it (compose's render service).
	render: enabled: true
}

// A VM on this Mac standing in for the home node until it is reachable: arm64,
// as Apple Silicon is.
Metal: envs.Metal & {
	context:  "contabo"
	// The node's API listens on it alone: each release tunnels to it over SSH.
	access: ssh: "pronto@144.91.92.217"
	registry: "us-central1-docker.pkg.dev/pronto-metal/pronto"
	build: project: "pronto-metal"
	ingress: id:    "45248135-7212-417a-af6d-b1bb2184e2d7"
	domainSuffix: "bsoneca.com"
}

metalManifests: (schema.#BuildManifests & {release: App, env: Metal}).manifests
