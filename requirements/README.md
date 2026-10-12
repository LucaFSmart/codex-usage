# Python test environments

The checked-in locks target Linux x86_64 and Python 3.14.2. The latest lane uses
Home Assistant 2026.10.1 and its matching custom-component pytest harness. The
minimum lane keeps Home Assistant 2026.3.0 to test the supported compatibility
floor against that release's actual dependency set.

Use uv 0.12.23 to regenerate either lock from the repository root. This is the
version pinned by the latest Home Assistant release; uv 0.13.0 conflicts with
that release's exact dependency and must not be added to the test environment.
When another uv version is installed locally, use
`uv tool run --from uv==0.12.23 uv` in place of `uv` in these commands:

```sh
uv pip compile requirements/latest/test-requirements.in --python-version 3.14.2 --python-platform x86_64-manylinux_2_28 --generate-hashes --output-file requirements/latest/test-requirements.txt
uv pip compile requirements/minimum/test-requirements.in --python-version 3.14.2 --python-platform x86_64-manylinux_2_28 --generate-hashes --output-file requirements/minimum/test-requirements.txt
```

The normal commands retain compatible versions already present in each lock.
For a deliberate transitive update, append `--upgrade-package PACKAGE`, then run
the normal command again so the generated header matches the reproducibility
check in CI. Do not override an exact Home Assistant dependency to silence an
advisory: that would stop the minimum lane from testing the declared version.
Upgrade Home Assistant and its matching harness together in the latest lane.

The minimum environment retains advisories inherited from Home Assistant
2026.3.0. It is a compatibility test environment and is not the integration's
deployment dependency file. Replacing that release's exact dependencies is not
a compatible way to resolve those advisories; advancing the supported floor
requires a separate compatibility decision.

Audit the complete pinned environment without trying to install its Linux
dependencies on the host:

```sh
uv tool run --from pip-audit==2.10.1 pip-audit --require-hashes --disable-pip --strict -r requirements/latest/test-requirements.txt
uv tool run --from pip-audit==2.10.1 pip-audit --require-hashes --disable-pip --strict -r requirements/minimum/test-requirements.txt
```

The audits report genuine upstream advisories. No advisory IDs are ignored.
