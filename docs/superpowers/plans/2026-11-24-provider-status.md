# Provider status and maintenance implementation plan

Goal: add requested independent public Codex status sensor and card and fix actionable
GitHub dependency problems with the user-selected new HA 2026.11.2 minimum (older users stay on 0.7.7).
Spec: ../specs/2026-11-24-provider-status-design.md

- [x] Backend: implement shared bounded independent provider-status coordinator,
  lifecycle, sensor/translations/icons, optional top-level card payload; write and
  observe focused failing tests before implementation. Own custom_components,
  backend tests and integration smoke fixtures; exclude generated frontend bundle.
- [x] Frontend: consume exact optional payload from spec, localized status row and
  incident notice, fixed official link, ignore unknown arbitrary provider fields;
  unit tests and browser coverage. Own frontend source and tests only.
- [x] Maintenance: root updates known safe dependency pins/actions and regenerates
  locks with uv 0.13.6. Audit current/minimum, confirm remaining HA exact-pin blockers.
- [x] Integrate/review: root checks shared contract, no unknown-to-healthy fallback,
  no provider request per account, no quota availability coupling, no credentials,
  status lifecycle independent of optional account-source failures.
- [x] Release preparation: synchronized 0.8.0 versions/docs, generated bundle,
  full local suites and candidate Linux CI pass. Publication remains gated on
  final PR and merged-commit checks; close superseded PRs after merge, then
  publish the matching GitHub release.

No implementation task may alter the other's owned source files. Root coordinates
version bumps after agents finish. Critical/important review findings get tests and
fixes before publication. Expected validation: all tests, lint and audits green for
current lane; both dependency environments must have zero known vulnerabilities.
