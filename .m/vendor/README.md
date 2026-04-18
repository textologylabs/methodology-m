# .m/vendor

Third-party modules vendored into `.m/` so that the methodology runtime
is self-contained once distributed into a user project. The user's
project does not need to install these itself.

## Contents

| File | Upstream | Version | License | Why vendored |
|---|---|---|---|---|
| `js-yaml.mjs` | [nodeca/js-yaml](https://github.com/nodeca/js-yaml) | 4.1.1 | MIT | YAML 1.2 parser used by `render-topology-artefacts` to read `project.yaml` |

## Updating

1. `cd cli && npm install js-yaml@<version> --save-dev`
2. Copy `cli/node_modules/js-yaml/dist/js-yaml.mjs` to `.m/vendor/js-yaml.mjs`
3. Update the version cell in the table above
4. Run `node --test .m/` to confirm parser tests still pass

Do not hand-edit the vendored files. Any behaviour changes must come
from a clean re-copy of an upstream release.

## Why vendor

`.m/` is distributed into user projects via `m init`. Importing modules
by name (e.g. `import yaml from 'js-yaml'`) would require the user's
project to install the dependency itself. Vendoring keeps the runtime
self-contained: a user project only needs Node ≥18 to run M's
capabilities.

The single-file ESM shape of js-yaml 4.x makes this cheap — one file,
no transitive dependencies.
