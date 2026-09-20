# Maintenance 0.7.3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the repository, CI, dependencies, security controls, documentation, and local Git metadata to the verified 2026-09-20 maintenance baseline.

**Architecture:** Preserve the existing Home Assistant integration and frontend architecture. Apply isolated maintenance updates, add a regression test for authenticated GET redirects, make Python CI environments reproducible with hash-locked requirements, and update GitHub repository controls without requiring an unavailable second reviewer.

**Tech Stack:** Python 3.14, Home Assistant 2026.9.3, pytest, Ruff, TypeScript 6, Lit 3, Vite, Vitest, Playwright, GitHub Actions, Dependabot.

**Spec:** User-approved repository audit delivered in this Codex task on 2026-09-20.

## Global Constraints

- Keep Home Assistant 2026.3.0 as the declared and tested minimum.
- Use Home Assistant 2026.9.3 and pytest-homeassistant-custom-component 0.13.366 for the current-runtime lane.
- Keep TypeScript at 6.0.3 until typescript-eslint supports TypeScript 7.
- Preserve all existing untracked research and plan documents; format and include them rather than deleting them.
- Do not require pull-request approval or administrator enforcement while the repository has only one administrator.
- Keep every third-party GitHub Action pinned to a full commit SHA.

---

### Task 1: Authenticated GET redirect hardening

**Files:**

- Modify: `tests/test_api.py`
- Modify: `custom_components/codex_usage/api.py`

**Interfaces:**

- Consumes: `CodexApiClient.async_get_usage`, `async_get_profile`, `async_get_accounts`, and `async_get_reset_credits`.
- Produces: All authenticated GET requests call `aiohttp.ClientSession.get(..., allow_redirects=False)`.

- [x] **Step 1: Make the fake session record GET keyword arguments and add a parameterized behavior test**

```python
@pytest.mark.parametrize(
    ("method", "payload"),
    [
        ("async_get_usage", {"rate_limit": {"allowed": True}}),
        ("async_get_profile", {}),
        ("async_get_accounts", {"accounts": []}),
        ("async_get_reset_credits", {"available_count": 0, "credits": []}),
    ],
)
def test_authenticated_get_requests_disable_redirects(
    method: str, payload: dict[str, object]
) -> None:
    session = _FakeSession(_FakeResponse(200, payload))
    credentials = CodexCredentials("access", "refresh", "id", 9_999_999_999, "workspace")
    asyncio.run(getattr(CodexApiClient(session), method)(credentials))
    assert session.last_kwargs is not None
    assert session.last_kwargs["allow_redirects"] is False
```

- [x] **Step 2: Run the new test and confirm it fails because GET calls omit `allow_redirects`**

Run: `.venv/Scripts/python.exe -m pytest tests/test_api.py -k authenticated_get_requests_disable_redirects -v`

- [x] **Step 3: Add `allow_redirects=False` to the profile, shared read-only, and usage GET calls**

```python
async with self._session.get(
    url,
    headers=headers,
    timeout=REQUEST_TIMEOUT,
    allow_redirects=False,
) as response:
```

- [x] **Step 4: Run the focused and full Python test suites**

Run: `.venv/Scripts/python.exe -m pytest tests/test_api.py -v`

Run: `.venv/Scripts/python.exe -m pytest`

### Task 2: Reproducible Python CI and current Home Assistant lane

**Files:**

- Create: `requirements/latest/requirements.in`
- Create: `requirements/latest/requirements.txt`
- Create: `requirements/minimum/requirements.in`
- Create: `requirements/minimum/requirements.txt`
- Modify: `.github/workflows/validate.yml`
- Modify: `.github/dependabot.yml`
- Modify: `README.md`
- Modify: `.github/ISSUE_TEMPLATE/bug_report.yml`

**Interfaces:**

- Consumes: pip requirement files on Python 3.14/Linux.
- Produces: Hash-verified latest and minimum CI environments and monthly Dependabot updates for Python locks.

- [x] **Step 1: Define exact direct requirements**

```text
# requirements/latest/requirements.in
homeassistant==2026.9.3
pytest==9.0.3
pytest-homeassistant-custom-component==0.13.366
ruff==0.16.8
uv==0.12.5
```

```text
# requirements/minimum/requirements.in
homeassistant==2026.3.0
pytest==9.1.1
ruff==0.16.8
```

- [x] **Step 2: Compile Linux/Python 3.14 lock files with hashes**

Run: `uv pip compile requirements/latest/requirements.in --python-version 3.14.2 --python-platform x86_64-manylinux_2_28 --generate-hashes --output-file requirements/latest/requirements.txt`

Run: `uv pip compile requirements/minimum/requirements.in --python-version 3.14.2 --python-platform x86_64-manylinux_2_28 --generate-hashes --output-file requirements/minimum/requirements.txt`

- [x] **Step 3: Replace ad-hoc workflow installs with `pip install --require-hashes -r ...` and update the current matrix to 2026.9.3**

- [x] **Step 4: Add separate monthly pip Dependabot entries, freeze only the supported Home Assistant floor, and update README/template version examples**

- [x] **Step 5: Copy both inputs to a temporary mirror, regenerate the locks under the same relative paths, compare them byte-for-byte, and run tests against the latest environment**

Run in the temporary mirror: `uv pip compile requirements/latest/requirements.in --python-version 3.14.2 --python-platform x86_64-manylinux_2_28 --generate-hashes --output-file requirements/latest/requirements.txt`

Run in the temporary mirror: `uv pip compile requirements/minimum/requirements.in --python-version 3.14.2 --python-platform x86_64-manylinux_2_28 --generate-hashes --output-file requirements/minimum/requirements.txt`

### Task 3: GitHub Action and frontend dependency updates

**Files:**

- Modify: `.github/workflows/validate.yml`
- Modify: `.github/workflows/codeql.yml`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `custom_components/codex_usage/frontend/codex-usage-card.js`

**Interfaces:**

- Consumes: pinned upstream action commits and npm lock data.
- Produces: Current hassfest/CodeQL actions and a fully validated frontend dependency set.

- [x] **Step 1: Pin hassfest to `58bff37c8947f690ace498be413a9b78d6f30f93` and CodeQL 4.38.1 to `1c5b675653bb5c22dbe9b12b556ec555138e09fd`**

- [x] **Step 2: Update the approved frontend packages while retaining TypeScript 6.0.3**

Run: `npm install --save-dev --save-exact @playwright/test@1.63.0 @vitest/coverage-v8@5.0.1 eslint@10.11.0 happy-dom@20.14.5 prettier@3.9.8 typescript-eslint@8.70.0 vite@8.3.0 vitest@5.0.1`

- [x] **Step 3: Run formatting, linting, type checking, unit/coverage tests, bundle reproduction, audit, and browser tests**

### Task 4: Security documentation and repository controls

**Files:**

- Modify: `SECURITY.md`
- Modify: `.github/codeql/codeql-config.yml` if its Dependabot wording is inaccurate.

**Interfaces:**

- Consumes: Existing GitHub branch protection and repository security settings.
- Produces: Accurate policy text, automated Dependabot security updates, required CodeQL contexts, linear history, and conversation resolution.

- [x] **Step 1: Clarify CodeQL and monthly dependency update behavior in SECURITY.md**

- [x] **Step 2: Enable GitHub automated security fixes**

Run: `gh api --method PUT repos/{owner}/{repo}/automated-security-fixes`

- [x] **Step 3: Update branch protection to require `analyze (python)` and `analyze (javascript-typescript)`, linear history, and conversation resolution while retaining no required review and no administrator enforcement**

- [x] **Step 4: Read back the settings and verify the exact effective controls**

### Task 5: Version alignment for 0.7.3

**Files:**

- Modify: `custom_components/codex_usage/manifest.json`
- Modify: `custom_components/codex_usage/const.py`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/src/visual-harness.ts`
- Modify: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Modify: `docs/installation.md`
- Modify: `docs/troubleshooting.md`
- Modify: `docs/upgrading-to-0.7.md`
- Modify: `CHANGELOG.md`
- Test: `tests/test_metadata.py`
- Test: `tests/test_card_data.py`
- Test: `tests/test_api.py`

**Interfaces:**

- Produces: Manifest, card cache key, User-Agent, frontend metadata, examples, and tests consistently report 0.7.3.

- [x] **Step 1: Change test expectations to 0.7.3 and confirm they fail against 0.7.2 production metadata**

- [x] **Step 2: Update every active version consumer and add the 0.7.3 changelog entry**

- [x] **Step 3: Rebuild the committed frontend bundle and rerun metadata, API, card-data, and frontend checks**

### Task 6: Document and Git metadata cleanup

**Files:**

- Add: the six pre-existing untracked research/plan documents.
- Add: `docs/superpowers/plans/2026-09-20-maintenance-0.7.3.md`
- Modify: `docs/superpowers/plans/2026-09-04-monitoring-reliability.md`
- Modify: `docs/superpowers/plans/2026-09-04-usage-alerts.md`
- Local metadata: `.git/objects/info/commit-graph`

**Interfaces:**

- Produces: A format-clean documentation set and a valid reachable commit graph.

- [x] **Step 1: Format the six documents with Prettier 3.9.8 and verify internal Markdown links**

- [x] **Step 2: Rebuild the commit graph with `git commit-graph write --reachable`**

- [x] **Step 3: Verify `git fsck --full --no-dangling`, `git diff --check`, and repository status**

### Task 7: Final verification

**Files:**

- Verify all changed files; do not add unrelated changes.

**Interfaces:**

- Produces: Fresh evidence for every completion claim.

- [x] **Step 1: Run Ruff 0.16.8 check/format, all Python tests, and the current/minimum environment tests**

- [x] **Step 2: Run all frontend checks and confirm `npm audit` reports zero vulnerabilities**

- [x] **Step 3: Validate YAML/JSON, internal links, action pins, version alignment, Git integrity, and GitHub setting readback**

- [x] **Step 4: Review the final diff for scope, security regressions, and accidental modifications**
