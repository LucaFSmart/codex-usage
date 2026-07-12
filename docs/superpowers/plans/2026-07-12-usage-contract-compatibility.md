# Usage Contract Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore correct duration-based Codex usage reporting and add safe read-only coverage for reset credits, credit overage state, and code-review limits.

**Architecture:** Keep the HTTP contract isolated in `api.py`, resolve known windows by duration through normalized data properties, and let Home Assistant entities consume those properties without relying on backend window position. Reuse the dynamic additional-limit entity path for code-review and unknown main-limit windows while preserving existing static entity IDs.

**Tech Stack:** Python 3.14, Home Assistant 2026.3+, aiohttp, pytest, Ruff.

## Global Constraints

- The integration remains read-only and must not call reset-credit mutation endpoints.
- Existing five-hour and weekly entity keys and unique IDs remain unchanged.
- Missing or malformed optional data remains unavailable instead of producing invented values.
- The undocumented endpoint disclaimer remains visible in README documentation.

---

### Task 1: Duration-aware normalized usage contract

**Files:**
- Modify: `tests/test_api.py`
- Modify: `custom_components/codex_usage/api.py`

**Interfaces:**
- Produces: `RateLimitWindow.duration_key`, `RateLimit.windows`, `CodexUsageData.five_hour_window`, `CodexUsageData.weekly_window`, `CodexUsageData.available_reset_credits`, and `CreditStatus.overage_limit_reached`.

- [ ] **Step 1: Write failing parser tests**

Add tests proving that a 604,800-second primary-only window resolves as weekly, a rounded 18,001-second window resolves as five-hour, positions can be reversed, unknown main windows are retained dynamically, code-review limits are normalized, reset-credit counts accept only non-negative integers, and overage state stays optional.

- [ ] **Step 2: Run parser tests and verify RED**

Run: `.venv\Scripts\python.exe -m pytest tests/test_api.py -q`

Expected: failures because duration resolution and new fields do not exist.

- [ ] **Step 3: Implement minimal normalization**

Add duration classification with five-percent tolerance, normalized window iteration, known-window resolution properties, optional credit fields, safe reset-credit count parsing, code-review normalization, and dynamic retention of unknown main windows.

- [ ] **Step 4: Run parser tests and verify GREEN**

Run: `.venv\Scripts\python.exe -m pytest tests/test_api.py -q`

Expected: all parser tests pass.

### Task 2: Home Assistant entities and metadata

**Files:**
- Modify: `tests/test_api.py`
- Modify: `tests/test_metadata.py`
- Modify: `custom_components/codex_usage/sensor.py`
- Modify: `custom_components/codex_usage/binary_sensor.py`
- Modify: `custom_components/codex_usage/strings.json`
- Modify: `custom_components/codex_usage/translations/en.json`
- Modify: `custom_components/codex_usage/translations/de.json`
- Modify: `custom_components/codex_usage/icons.json`

**Interfaces:**
- Consumes: duration-resolved properties from Task 1.
- Produces: existing correct static sensors plus `available_reset_credits` and `credits_overage_limit_reached` entities.

- [ ] **Step 1: Write failing entity tests**

Assert that weekly-only primary data drives weekly sensors and pace, not five-hour sensors; assert new static entity metadata is covered.

- [ ] **Step 2: Run tests and verify RED**

Run: `.venv\Scripts\python.exe -m pytest tests/test_api.py tests/test_metadata.py -q`

Expected: failures from positional sensor access and missing entity metadata.

- [ ] **Step 3: Implement entity changes**

Switch static value functions and pace calculation to resolved windows, add the two new read-only entities, and use duration-based display labels for dynamic windows while retaining stable positional IDs for existing additional limits.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `.venv\Scripts\python.exe -m pytest tests/test_api.py tests/test_metadata.py -q`

Expected: all targeted tests pass.

### Task 3: Release documentation and dashboard

**Files:**
- Modify: `README.md`
- Modify: `dashboards/codex_usage.yaml`
- Modify: `CHANGELOG.md`
- Modify: `custom_components/codex_usage/manifest.json`
- Modify: `tests/test_metadata.py`

**Interfaces:**
- Produces: release `0.3.0` documentation and metadata.

- [ ] **Step 1: Change the metadata test to expect version 0.3.0 and verify RED**

Run: `.venv\Scripts\python.exe -m pytest tests/test_metadata.py::test_hacs_and_manifest_metadata -q`

Expected: failure showing manifest version `0.2.0`.

- [ ] **Step 2: Update release files**

Document duration-based compatibility, optional unavailable windows, reset credits, credit overage, and code-review limits; add dashboard entities; add a dated 0.3.0 changelog entry; bump the manifest.

- [ ] **Step 3: Verify metadata GREEN**

Run: `.venv\Scripts\python.exe -m pytest tests/test_metadata.py -q`

Expected: all metadata tests pass.

### Task 4: Full verification and publication

**Files:**
- Verify all modified files.

**Interfaces:**
- Produces: tested commit pushed to `origin/main`.

- [ ] **Step 1: Run formatting and lint checks**

Run: `.venv\Scripts\python.exe -m ruff format --check .`

Run: `.venv\Scripts\python.exe -m ruff check .`

Expected: both commands exit 0.

- [ ] **Step 2: Run all test suites**

Run: `.venv\Scripts\python.exe -m pytest -q`

Run: `.venv\Scripts\python.exe -m pytest tests_integration -q`

Expected: both commands exit 0.

- [ ] **Step 3: Validate live response without exposing account data**

Use the local Codex OAuth token only against `chatgpt.com/backend-api/wham/usage`, pass the returned object through `parse_usage`, and print only resolved window durations and optional-field presence.

Expected: the live 604,800-second primary window resolves to weekly and not five-hour.

- [ ] **Step 4: Review diff, commit, and push**

Run: `git diff --check`, review `git diff`, commit all release changes with a focused message, then run `git push origin main`.

Expected: clean diff checks, successful commit, and successful push.
