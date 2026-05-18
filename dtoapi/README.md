# utoplan.me API

The active API is the modern Node implementation under `modern/`.

Legacy Nodal source was removed from the normal project tree after its public
read behavior was captured by compatibility tests and migrated to the modern
server. New endpoint work should extend `modern/server.js`, `modern/records.js`,
and the Docker-backed contracts in `modern/test/`.
