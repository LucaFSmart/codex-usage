# Python test environments

The checked-in locks target Linux x86_64 and Python 3.14.2. The latest lane
uses Home Assistant 2026.11.2. The minimum lane pins Home Assistant 2026.11.2, the explicitly selected supported
compatibility floor for 0.8. Older HA users should stay on Codex Usage 0.7.7.
These are development environments, not deployment requirements.

Use uv 0.13.6, the version pinned by the current HA target, to regenerate the
locks. If another uv is installed locally, use
`uv tool run --from uv==0.13.6 uv` instead of `uv`:

```sh
uv pip compile requirements/latest/test-requirements.in --python-version 3.14.2 --python-platform x86_64-manylinux_2_28 --generate-hashes --output-file requirements/latest/test-requirements.txt
uv pip compile requirements/minimum/test-requirements.in --python-version 3.14.2 --python-platform x86_64-manylinux_2_28 --generate-hashes --output-file requirements/minimum/test-requirements.txt
```

The portable tests manage Home Assistant directly and use `asyncio.run`; they
do not use fixtures from `pytest-homeassistant-custom-component`. That unused
harness was removed from the latest lane because its newest published version
pins HA 2026.10.4 and would prevent testing the current stable runtime. The
latest lane retains pytest-asyncio for the explicit pytest asyncio options.

Home Assistant 2026.11.2 pins Pillow 13.0.0, so the old test-only Pillow override
is no longer needed. Both locks now use Home Assistant's actual dependency
requirements without overrides. CI installs the fully resolved, hash-locked
packages with `--no-deps` and verifies byte-for-byte lock reproduction.

Normal compilation retains compatible versions already present in each lock.
For a deliberate transitive update, append `--upgrade-package PACKAGE`, then
run the normal command again so the header matches CI's command.

Both current and minimum environments must pass the strict vulnerability audit.
The former HA 2026.3.0 snapshot was retired with the user's explicit minimum-
version decision; vulnerabilities are fixed by dependency changes, not dismissed
or excluded from scanning. No advisory IDs are ignored.

Audit either lock without installing Linux dependencies on the host:

```sh
uv tool run --from pip-audit==2.10.1 pip-audit --require-hashes --disable-pip --strict -r requirements/latest/test-requirements.txt
uv tool run --from pip-audit==2.10.1 pip-audit --require-hashes --disable-pip --strict -r requirements/minimum/test-requirements.txt
```
