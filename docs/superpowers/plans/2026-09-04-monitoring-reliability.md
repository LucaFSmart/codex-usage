# Monitoring Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Widerspruchsfreie Reset-Anzeigen, vollständige Zusatzlimit-Zustände, nachvollziehbares Quellenalter und fachlich korrekte Entity-Metadaten liefern.

**Architecture:** Kleine reine Auswertungsfunktionen ergänzen den bestehenden Coordinator. Sensoren und Kartenbackend verwenden dieselbe Auswertung; das Frontend erhält additive Status-/Quellenfelder. Der Netzwerkzugriff bleibt unverändert.

**Tech Stack:** Python 3.14, Home Assistant, aiohttp, Lit, TypeScript, Vite, pytest, Vitest, Playwright.

**Spec:** `docs/research/2026-09-04-comprehensive-peer-and-architecture-audit.md`, Paket A; ergänzende Detailregeln in `docs/research/2026-09-04-feasibility-and-roadmap.md`. Aufwand 24–38 h.

## Global Constraints

- Home Assistant mindestens 2026.3.0; vorhandene CI-Prüfung mit 2026.8.3 beibehalten.
- Python 3.14, bestehendes aiohttp-/Coordinator-Muster; Frontend Lit/TypeScript/Vite.
- Kein neuer externer Laufzeitdienst und keine neue Python- oder Frontend-Abhängigkeit im ersten Paket.
- Keine neuen kontoverändernden Aktionen; Blueprint-Aktionen werden ausschließlich vom Nutzer konfiguriert.
- Bestehende Entity-Unique-IDs und Historien bleiben erhalten; neue optionale Sensoren standardmäßig deaktiviert.
- Kartenprotokoll `schema_version: 1` nur additiv erweitern; neuer Client akzeptiert fehlende Zusatzfelder aus alten Snapshots.
- Keine Rohantworten, Tokens, Account-Backend-IDs oder Fehlertexte in Kartendaten aufnehmen; bestehende Berechtigungsprüfung beibehalten.
- DE/EN-Texte gemeinsam pflegen; unbekannte Werte nicht in null Prozent oder null Guthaben umwandeln.
- Bestehende Usage- und optionale Abrufintervalle im ersten Paket beibehalten.

Dieser Plan autorisiert keine Veröffentlichung. Bei Ausführung zunächst aktuellen Git-Stand prüfen und vorhandene Nutzeränderungen erhalten. Der Plan basiert auf `ba63247`; Änderungen seitdem vor Bearbeitung abgleichen. Delegation nur entsprechend der dann geltenden Nutzer-/Agentenanweisungen. Kein pauschaler Versionssprung während der Implementierung; Release-Version erst im tatsächlichen Release-Schritt konsistent setzen.

## Dateiverantwortung

| Datei                                                           | Änderung                                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Neu: `custom_components/codex_usage/monitoring.py`              | Reine Reset-Auswertung und Klassifizierung des Quellenzustands              |
| `custom_components/codex_usage/api.py`                          | Fehlende Reset-Anzahl als `None` erhalten                                   |
| `custom_components/codex_usage/coordinator.py`                  | Gemeinsame Reset-Auswertung als Property; vorhandene Quellzeitpunkte nutzen |
| `custom_components/codex_usage/card_data.py`                    | Gemeinsame Reset-Werte, vollständige Statusliste, sichere Quellenmetadaten  |
| `custom_components/codex_usage/sensor.py`                       | Bestehenden Reset-Sensor anbinden, vier neue optionale Timestamp-Sensoren   |
| `frontend/src/types.ts`, `card-data.ts`, `view-model.ts`        | Additive Felder, Normalisierung und Ableitung der Anzeigen                  |
| `frontend/src/codex-usage-card.ts`, `localize.ts`               | Betroffene Funktion, Quellenalter und lokaler Uhrzeittakt                   |
| `custom_components/codex_usage/translations/de.json`, `en.json` | Namen der neuen Entities                                                    |
| Backend-/Frontend-Tests und Linux-Smoke-Test                    | Nachgewiesene Widersprüche und Kompatibilität absichern                     |

## Task 1 — Gemeinsame Reset-Auswertung (4–6 h)

**Files:** Neu `monitoring.py`, `tests/test_monitoring.py`; ändern `api.py`, `coordinator.py`, `sensor.py`, `card_data.py`, `tests/test_api.py`, `tests/test_entities.py`, `tests/test_card_data.py`, `frontend/src/types.ts`, `frontend/src/card-data.ts`, `frontend/tests/card-data.test.ts`. Alle Komponentenpfade beziehen sich auf `custom_components/codex_usage/`.

**Interfaces:** `ResetCredits.available_count: int | None`. Neue Funktion `summarize_reset_credits(usage_count: int | None, details: ResetCredits | None, details_updated_at: datetime | None, now: datetime) -> ResetSummary`. Neue Coordinator-Property `reset_summary: ResetSummary` verwendet `self.data.usage.available_reset_credits`, `self.data.reset_credits`, `self.reset_last_success` und UTC-Jetzt. Property nur nach vorhandenem `data` auswerten, wie bei bisherigen Sensorwerten.

- [ ] Regression zuerst in `tests/test_monitoring.py` anlegen:

```python
from datetime import UTC, datetime, timedelta

from custom_components.codex_usage.api import ResetCredit, ResetCredits
from custom_components.codex_usage.monitoring import summarize_reset_credits

NOW = datetime(2026, 9, 4, 12, tzinfo=UTC)


def test_current_count_overrides_conflicting_details():
    details = ResetCredits(
        1, 3, (ResetCredit("weekly", "available", None, NOW + timedelta(days=1)),)
    )
    result = summarize_reset_credits(4, details, NOW, NOW)
    assert result.available_count == 4
    assert result.count_source == "usage"
    assert result.next_known_expiry is None
    assert result.details_consistent is False


def test_stale_details_do_not_become_zero_or_current_count():
    result = summarize_reset_credits(None, ResetCredits(1, 3, ()), NOW - timedelta(days=7), NOW)
    assert result.available_count is None
    assert result.count_source == "unknown"


def test_only_future_available_row_can_provide_known_expiry():
    future = NOW + timedelta(days=1)
    details = ResetCredits(
        1,
        3,
        (
            ResetCredit("weekly", "consumed", None, NOW + timedelta(hours=1)),
            ResetCredit("weekly", "available", None, NOW - timedelta(hours=1)),
            ResetCredit("weekly", "available", None, future),
        ),
    )
    assert summarize_reset_credits(1, details, NOW, NOW).next_known_expiry == future
```

- [ ] Ausführen: `.venv\Scripts\python.exe -m pytest tests/test_monitoring.py -v`; zunächst fehlenden Import als erwartetes Scheitern bestätigen.
- [ ] Reine Auswertung mit folgendem Vertrag implementieren; bestehende Datenklassen importieren:

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from .api import ResetCredits

OPTIONAL_FRESH_SECONDS = 7200


@dataclass(frozen=True, slots=True)
class ResetSummary:
    available_count: int | None
    total_earned: int | None
    next_known_expiry: datetime | None
    count_source: Literal["usage", "details", "unknown"]
    details_consistent: bool


def summarize_reset_credits(
    usage_count: int | None,
    details: ResetCredits | None,
    details_updated_at: datetime | None,
    now: datetime,
) -> ResetSummary:
    age = (now - details_updated_at).total_seconds() if details_updated_at else None
    recent = age is not None and 0 <= age <= OPTIONAL_FRESH_SECONDS
    usable = details if recent else None
    count = usage_count
    source: Literal["usage", "details", "unknown"] = "usage"
    if count is None:
        count = usable.available_count if usable else None
        source = "details" if count is not None else "unknown"
    consistent = usable is not None and count is not None and usable.available_count == count
    candidates = (
        [
            row.expires_at
            for row in usable.credits
            if row.status == "available" and row.expires_at is not None and row.expires_at > now
        ]
        if usable and consistent and count is not None and count > 0
        else []
    )
    return ResetSummary(
        count,
        usable.total_earned_count if usable else None,
        min(candidates, default=None),
        source,
        consistent,
    )
```

- [ ] In `parse_reset_credits` das `or 0` entfernen; Dataclass-Feld nullable machen. Test `assert parse_reset_credits({}).available_count is None` ergänzen; `0` muss weiterhin `0` ergeben. Vorhandene Parservalidierung für negative/ungültige Zahlen beibehalten.
- [ ] Coordinator-Property ergänzen. In `CodexUsageSensor.native_value` beim bestehenden Schlüssel `available_reset_credits` `self.coordinator.reset_summary.available_count` zurückgeben; andere `value_fn(CodexUsageData)` unverändert lassen. In `_account_payload` dieselbe Property nutzen und `next_known_expiry` auf vorhandenes Feld `next_expiry` abbilden. `reset_credits` bleibt `None`, wenn weder Zähler noch aktuelle Metadaten bekannt sind. `count_source` und `details_consistent` additiv übertragen.
- [ ] Frontend-Typ `CardAccount.reset_credits` um `count_source?: "usage" | "details" | "unknown"` und `details_consistent?: boolean` ergänzen. Parser erlaubt nur diese Quellenwerte, verwendet bei fehlendem/unbekanntem Quellenwert `"unknown"` und bei fehlender Konsistenz `false`. Frontend-Kartendatentest prüft bekannte `0`, unbekannte `null` und alte Snapshots ohne Zusatzfelder.
- [ ] Kartentest-Fixtures um `reset_summary` beziehungsweise echte Coordinator-Property ergänzen; explizite Erwartung „Sensor 4 und Karte 4“ für widersprüchliche Details sowie „Sensor 0 und Karte 0“ für leeren aktuellen Bestand aufnehmen. Ein zusätzlicher Test prüft frischen Details-Fallback bei fehlender Usage-Anzahl.
- [ ] Ausführen: `.venv\Scripts\python.exe -m pytest tests/test_monitoring.py tests/test_api.py tests/test_entities.py tests/test_card_data.py`. Bestehende Unique-ID des Reset-Sensors im Test unverändert erwarten. Diff auf zusätzliche Requests prüfen.

**Abnahme:** Kein Widerspruch zwischen Zählern; fehlender Wert bleibt unbekannt; widersprüchliche/veraltete Details erzeugen kein aktuelles Ablaufdatum. `total_earned` ist ein Detailwert und wird nicht als Verbrauchsstatistik klassifiziert.

## Task 2 — Fensterunabhängiger Limitstatus (4–6 h)

**Files:** Ändern `card_data.py`, `tests/test_card_data.py`, `frontend/src/types.ts`, `card-data.ts`, `view-model.ts`, `codex-usage-card.ts`, `localize.ts`, `frontend/tests/card-data.test.ts`, `view-model.test.ts`, `card.test.ts`.

**Interfaces:** Neue Backend-Funktion `_limit_statuses(usage: CodexUsageData) -> list[dict[str, Any]]`. Additives `CardAccount.limit_statuses?: CardLimitStatus[]`; `CardLimitStatus = { id: string; name: string; source: "main" | "additional"; reached: boolean | null }`. `AccountViewModel.reachedLimits: CardLimitStatus[]` enthält nur explizite Sperren. `CardLimit.reached` wird `boolean | null`.

- [ ] Folgende Backend-Regression ergänzen und vor Implementierung scheitern lassen:

```python
from custom_components.codex_usage.api import parse_usage
from custom_components.codex_usage.card_data import _limit_statuses


def test_windowless_additional_limit_keeps_its_blocked_status():
    usage = parse_usage(
        {
            "rate_limit": {
                "allowed": True,
                "primary_window": {"used_percent": 10, "limit_window_seconds": 18000},
            },
            "additional_rate_limits": [
                {
                    "metered_feature": "review",
                    "limit_name": "Review",
                    "rate_limit": {"allowed": False},
                }
            ],
        }
    )
    assert any(row["name"] == "Review" and row["reached"] is True for row in _limit_statuses(usage))
```

- [ ] `_limit_statuses` über Hauptlimit und Zusatzlimits bilden; ID `f"{source}:{limit.limit_id}"`. Synthetische Duplikate überspringen, wenn ein Zusatzlimit Fenster besitzt und alle Fensterobjekte schon zum Hauptlimit gehören. Leere Fensterliste ausdrücklich nicht überspringen:

```python
main_windows = {id(window) for _, window in usage.main_limit.windows}
duplicate = bool(limit.windows) and all(id(window) in main_windows for _, window in limit.windows)
```

- [ ] Im Kartenparser `nullableBoolean` für `reached` verwenden. `limit_statuses` nur als geprüftes Array erlauben; IDs/Namen als Text und Quelle nur `main`/`additional`. Wenn Feld fehlt, Status aus vorhandenen Fensterzeilen ableiten. Fremde Felder weiterhin nicht übernehmen.
- [ ] Frontend-Regression in `frontend/tests/view-model.test.ts` ergänzen:

```typescript
it("shows a blocked additional feature while keeping the healthy main window", () => {
  const snapshot = structuredClone(SNAPSHOT);
  const account = snapshot.accounts[0]!;
  account.limit_statuses = [
    {
      id: "additional:review",
      name: "Review",
      source: "additional",
      reached: true,
    },
  ];
  const model = buildCardViewModel(
    { ...snapshot, accounts: [account] },
    DEFAULT_CONFIG,
  );
  expect(model.selectedAccount?.severity).toBe("blocked");
  expect(model.selectedAccount?.limits[0]?.severity).toBe("ok");
  expect(model.selectedAccount?.reachedLimits[0]?.name).toBe("Review");
});
```

- [ ] `reachedLimits` aus expliziten `=== true` bilden. Gesamtstatus bei mindestens einer Sperre `blocked`; einzelne Fenster weiterhin anhand ihres Status/der schon vorhandenen globalen Blocker bewerten. Keine globale Sperre aus Zusatzlimits in `account.blocker` erfinden. Bei `isMoreConstrained` booleschen Vergleich explizit mit `=== true` ausführen.
- [ ] In der Karte eine benannte Statuszeile für fensterlose Limits anzeigen. DE „Mindestens ein Limit erreicht“ / EN „At least one limit reached“; Kontext „Review: Limit erreicht“ statt erfundener Prozentzahl. Bestehende globale Spend-/Credit-Blocker behalten ihren spezifischen Text. `additional_limits` ist auch bei passenden Statuszeilen ohne Fenster sichtbar. Test für Textdarstellung eines Namens mit HTML-Zeichen ergänzen.
- [ ] Ausführen: Backend-Kartentests; im Verzeichnis `frontend`: `npm.cmd test -- tests/card-data.test.ts tests/view-model.test.ts tests/card.test.ts` und `npm.cmd run typecheck`. Alt-Snapshot ohne neue Felder, unbekannten Zustand und synthetische Hauptfenster-Duplikate prüfen.

**Abnahme:** Die ursprüngliche fensterlose Sperre ist sichtbar; ein gesunder Hauptbalken bleibt gesund; unbekannter Zustand wird nicht zu einem behaupteten `false` normalisiert.

## Task 3 — Quellenfrische und Uhrzeitaktualisierung (5–8 h)

**Files:** `monitoring.py`, `card_data.py`, `tests/test_monitoring.py`, `tests/test_coordinator.py`, `tests/test_card_data.py`; `frontend/src/types.ts`, `card-data.ts`, `view-model.ts`, `codex-usage-card.ts`, `localize.ts`; `frontend/tests/view-model.test.ts`, `card.test.ts`.

**Interfaces:** Python `source_state(last_success: datetime | None, available: bool | None, failed: bool) -> Literal["ok", "error", "unsupported", "never"]`. `CardAccount.sources?: { usage: CardSource; profile: CardSource; reset_details: CardSource }`; `CardSource = { updated_at: string | null; state: "ok" | "error" | "unsupported" | "never" }`. Frontend `sourceIsStale(source: CardSource | undefined, now: Date): boolean`, fehlende Metadaten gelten als unbekannt/veraltet.

- [ ] Reine Statusklassifikation implementieren und mit folgenden Erwartungen prüfen:

```python
def source_state(last_success, available, failed):
    if available is False:
        return "unsupported"
    if failed:
        return "error"
    return "ok" if last_success is not None else "never"


def test_source_state_does_not_hide_a_failed_refresh():
    from custom_components.codex_usage.monitoring import source_state

    assert source_state(NOW, True, True) == "error"
    assert source_state(NOW, False, True) == "unsupported"
    assert source_state(None, None, False) == "never"
```

Implementierung mit der oben festgelegten Typannotation versehen. Für `usage` `last_update_success` separat auf `ok`/`error` abbilden, ohne einen Core-Fehler als `unsupported` zu behandeln.

- [ ] Quellenfelder aus vorhandenen Coordinator-Properties aufbauen: `last_success`, `profile_last_success`, `reset_last_success`, optionale `available` und `bool(last_error)`. Fehlerklasse selbst nicht übertragen. Coordinator-Regressionsfall „erfolgreiche optionale Antwort, später Fehler, Cache erhalten“ erweitern; Quellzeitpunkt muss beim Fehler unverändert bleiben.
- [ ] Frontend normalisiert fehlende Quellen auf unbekannte Anzeige. Alter optionaler Daten nach 7.200 Sekunden markieren; ungültige/zukünftige Zeitpunkte konservativ behandeln:

```typescript
export function sourceIsStale(
  source: CardSource | undefined,
  now: Date,
): boolean {
  if (!source?.updated_at) return true;
  const age = now.getTime() - Date.parse(source.updated_at);
  return !Number.isFinite(age) || age < 0 || age > 7_200_000;
}
```

- [ ] Test in `view-model.test.ts` für sieben Tage altes Profil und frisches Usage ergänzen; Usage bleibt frisch. Fehlerstatus sofort sichtbar erwarten, auch bei 30 Sekunden alten Cachewerten. Reset-Anzahl mit `count_source: "usage"` nicht als veraltet beschriften, wenn nur Details alt sind. Detailfelder bei überaltertem Snapshot lokal nicht als aktuellen Ablauf/aktuellen Gesamtbestand ausgeben.
- [ ] Karte um Lifecycle-Timer ergänzen: im verbundenen Zustand einmal `window.setInterval(() => this.requestUpdate(), 60_000)` registrieren, in `disconnectedCallback` mit `window.clearInterval` entfernen und gespeicherte ID löschen; vorhandene Lifecycle-Methoden erweitern, nicht ersetzen. Timer ruft keine Ladefunktion auf. Rendering muss ViewModel jeweils mit aktuellem `Date` berechnen.
- [ ] Mit Vitest Fake Timers 121 Minuten ohne neuen Snapshot vorspulen, veralteten Detailstatus erwarten, dann Karte entfernen und unveränderte Anzahl `callWS`-Aufrufe/aufgeräumten Timer prüfen. Backend `test_coordinator.py`, `test_card_data.py` und Frontend `view-model.test.ts`, `card.test.ts` ausführen.

**Abnahme:** Quellfehler beeinflussen nur die betroffene Anzeige; ältere optionale Daten erhalten keinen frischen Gesamtzeitstempel als Ersatz; keine höheren Backend-Abfrageraten.

## Task 4 — Optionale Timestamp-Sensoren (3–5 h)

**Files:** `sensor.py`, `translations/de.json`, `translations/en.json`, `tests/test_entities.py`, `tests_integration/test_integration_smoke.py`, `README.md`.

**Interfaces:** Neue `CodexMetadataSensorDescription(SensorEntityDescription)` mit `value_fn: Callable[[CodexUsageCoordinator], datetime | None]`; neue `CodexMetadataSensor(CodexUsageEntity, SensorEntity)`. Entity-Unique-ID `f"{identity}_{description.key}"`.

- [ ] Vier Beschreibungen unter `METADATA_SENSORS` definieren; alle `entity_registry_enabled_default=False`, `device_class=SensorDeviceClass.TIMESTAMP`, keine Statistikklasse:

```python
# key -> value_fn; die drei *_last_success erhalten EntityCategory.DIAGNOSTIC
{
    "next_known_reset_credit_expiry": lambda coordinator: (
        coordinator.reset_summary.next_known_expiry
    ),
    "usage_last_success": lambda coordinator: coordinator.last_success,
    "profile_last_success": lambda coordinator: coordinator.profile_last_success,
    "reset_details_last_success": lambda coordinator: coordinator.reset_last_success,
}
```

- [ ] Klasse nach bestehendem `CodexUsageSensor`-Muster erstellen. `native_value` verwendet die Coordinator-Funktion. Verfügbarkeit für die drei Diagnose-Zeitpunkte an bekannte Zeitpunkte binden, damit diese bei Core-Ausfällen lesbar bleiben; Ablauf-Sensor verwendet normale Coordinator-Verfügbarkeit. Alle vier im `async_setup_entry` registrieren.
- [ ] Tests für deaktivierte Standardregistrierung, Timestamp-Klasse, bestehende Reset-Unique-ID sowie Diagnose bei Core-Ausfall ergänzen. Zentrale erwartete Assertion:

```python
assert entity.unique_id == f"{identity}_profile_last_success"
assert entity.native_value == last_profile_success
assert entity.available is True  # bekanntes Datum trotz last_update_success=False
assert entity.entity_description.entity_registry_enabled_default is False
```

`entity` im Test durch `CodexMetadataSensor` mit den vorhandenen Entry-/Coordinator-Fixtures instanziieren, anschließend `last_update_success=False` setzen. Für unbekannten Zeitstempel `available=False` erwarten.

- [ ] DE/EN-Namen festlegen: „Nächster bekannter Reset-Ablauf“ / „Next known reset credit expiry“, „Letzter erfolgreicher Usage-Abruf“ / „Last successful usage fetch“, entsprechend „Profil“/„profile“ und „Reset-Details“/„reset details“.
- [ ] Linux-Smoke-Test um konkrete Registry-Unique-IDs und deaktivierten Status ergänzen. Die bisherige Zahl 31 nicht pauschal erhöhen: Registry-Einträge und tatsächlich geladene Entities getrennt prüfen, da die neuen Sensoren deaktiviert sind. README erklärt Aktivierung und unvollständige Ablaufdetails.
- [ ] `.venv\Scripts\python.exe -m pytest tests/test_entities.py` ausführen. Linux-Smoke-Test in Task 5 einschließen.

**Abnahme:** Neue Metadaten sind optional nutzbar, bestehende IDs unverändert; kein Ablaufdatum aus ungeeigneten Details.

## Task 5 — Statistikklassen, dynamische Namen und ID-Recovery (4–6 h)

**Files:** `sensor.py`, `api.py`, `translations/de.json`, `translations/en.json`, `icons.json`, `tests/test_entities.py`, `tests/test_metadata.py`, optional neuer gezielter Registry-Upgrade-Test unter `tests_integration/`, `README.md`, `CHANGELOG.md` erst bei tatsächlicher Releasevorbereitung.

**Interfaces:** Profil-State-Class-Matrix: `TOTAL` für `lifetime_tokens`, `total_threads`, `total_skills_used`, `unique_skills_used`; `MEASUREMENT` nur für `current_streak_days`; keine State Class für `peak_daily_tokens`, `longest_streak_days`, `longest_running_turn`, `fast_mode_usage`, `most_used_reasoning_effort` und `most_used_reasoning_effort_percentage`. Prozent-Usage/Pace-Sensoren bleiben `MEASUREMENT`. Neue dynamische Übersetzungsschlüssel `additional_limit_usage`, `additional_limit_remaining`, `additional_limit_reset` verwenden `translation_placeholders` für Feature und sprachneutrale Dauer. Bestehende Unique IDs bleiben unverändert.

- [ ] Metadatentest zuerst auf die vollständige Matrix erweitern:

```python
from homeassistant.components.sensor import SensorStateClass


def test_profile_state_classes_match_reported_semantics():
    descriptions = {item.key: item for item in PROFILE_SENSORS}
    assert descriptions["lifetime_tokens"].state_class is SensorStateClass.TOTAL
    assert descriptions["total_threads"].state_class is SensorStateClass.TOTAL
    assert descriptions["total_skills_used"].state_class is SensorStateClass.TOTAL
    assert descriptions["unique_skills_used"].state_class is SensorStateClass.TOTAL
    assert descriptions["current_streak_days"].state_class is SensorStateClass.MEASUREMENT
    for key in (
        "peak_daily_tokens",
        "longest_streak_days",
        "longest_running_turn",
        "fast_mode_usage",
        "most_used_reasoning_effort",
        "most_used_reasoning_effort_percentage",
    ):
        assert descriptions[key].state_class is None
```

- [ ] Test scheitern lassen: `.venv\Scripts\python.exe -m pytest tests/test_entities.py::test_profile_state_classes_match_reported_semantics -v`. Dann nur die Beschreibungsmetadaten ändern. Keine Zustände, Einheiten oder Unique IDs ändern.
- [ ] Registry-/Recorder-Upgrade in echter HA-Testumgebung prüfen: Ein vorhandener Entity-Registry-Eintrag mit `lifetime_tokens` behält `entity_id` und `unique_id`; Statistikmetadaten akzeptieren den Wechsel von `total_increasing` zu `total`. Keine Recorderzeilen löschen oder umschreiben. Falls HA 2026.3.0 den Metadatenwechsel ablehnt, Umsetzung stoppen und die Alternative „State Class zunächst unverändert, dokumentierter Deprecationpfad“ bewerten.
- [ ] Dynamische Namen durch Übersetzungsschlüssel erzeugen. `RateLimitWindow` stellt dafür eine sprachneutrale Dauer (`5 h`, `7 d`, `90 min`, `unknown`) bereit; der Anzeigename aus dem Backend bleibt begrenzt und wird als Placeholder eingesetzt. Beispielerwartung für ein neues Entity: EN `Code review 5 h usage`, DE `Code review – Nutzung (5 h)`. Kein Anzeigename wird in die Unique ID aufgenommen.
- [ ] Verhalten für existierende Registry-Entities festlegen und testen: Nutzerdefinierte Namen bleiben unangetastet; HA darf einen schon gespeicherten Namen nicht zwangsweise ersetzen. Wenn automatisch erzeugte alte Namen nicht sicher von Nutzerwerten unterscheidbar sind, nur neue Entities lokalisieren und die Grenze dokumentieren.
- [ ] `_existing_additional_keys` auf einen eindeutigen rechten Suffixparser umstellen. Regression:

```python
def test_dynamic_id_with_primary_inside_limit_id_recovers_secondary_window():
    assert _existing_additional_keys(
        {"identity_image_primary_generation_secondary_usage"}, "identity"
    ) == {("image_primary_generation", "secondary", "usage")}
```

Geeigneter Vertrag: Regex `^(?P<limit>.+)_(?P<window>primary|secondary)_(?P<metric>usage|remaining|reset)$` auf den String nach Identity-Präfix; leere Limit-ID ablehnen. Keine bestehenden Unique IDs umbenennen.

- [ ] Doppelte normalisierte `limit_id` in Diagnostik zählen, ohne fremde Rohobjekte zu speichern. Noch keine automatische ID-Suffixerfindung: Das braucht einen beobachteten Vertrag und eine eigene Migrationsentscheidung.
- [ ] Entity-, Übersetzungs-, Icon- und Linux-Registrytests ausführen. Release Notes müssen den State-Class-Wechsel und die fehlende rückwirkende Neuinterpretation alter Statistiken erklären.

**Abnahme:** HA-Metadaten entsprechen dem Datentyp, alle IDs/Historien bleiben adressierbar, neue dynamische Namen sind lokalisierbar und interne `_primary_`/`_secondary_`-Bestandteile verhindern keine Wiederherstellung.

## Task 6 — Gemeinsame Abnahme und Auslieferbarkeit (4–7 h)

**Files:** Bestehende Tests; `frontend/visual-tests/responsive.spec.ts`; `README.md`; generiert `custom_components/codex_usage/frontend/codex-usage-card.js`. `.github/workflows/validate.yml` nur ändern, wenn ein benötigter Test bisher nicht aufgerufen wird.

- [ ] Gesamtdiff gegen Global Constraints prüfen: keine Requests hinzugefügt, keine Account-IDs/Rohdaten im Snapshot, keine bestehenden Unique-IDs geändert. Berechtigungstests für eingeschränkte Nutzer und mehrere Entries bleiben aktiv.
- [ ] Python-Prüfungen im Projektverzeichnis durchführen:

```powershell
.venv\Scripts\python.exe -m ruff check .
.venv\Scripts\python.exe -m ruff format --check .
.venv\Scripts\python.exe -m pytest
```

- [ ] Im Verzeichnis `frontend` vorhandene Qualitätsgates ausführen:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:coverage
npm.cmd run build
npm.cmd run test:visual
```

- [ ] Visuelle Regression um „frisches Hauptlimit + gesperrtes fensterloses Zusatzlimit + altes Profil“ ergänzen. Auf schmalem und breitem Layout Namen, Alter, Tastaturbedienung und Umbrechen prüfen. Keine neue visuelle Grundgestaltung.
- [ ] Unter Linux die vorhandenen CI-Umgebungen HA 2026.3.0 und 2026.8.3 ausführen; insbesondere `pytest tests_integration/test_integration_smoke.py -v -o asyncio_mode=auto`. Windows-Unit-Tests sind kein Ersatz. Verifikation kann über vorhandene CI erfolgen, sobald ein PR-/Push-Auftrag vorliegt; ohne diese Berechtigung lokal/isoliert verfügbare Linux-Umgebung verwenden oder das ausstehende Gate ausdrücklich nennen.
- [ ] Erzeugtes Bundle in den Änderungsumfang aufnehmen und Reproduzierbarkeit prüfen. `check:bundle` erst gegen den Stand ausführen, der das neue Bundle enthält; ein erwarteter Build-Diff zum alten Commit ist kein Reproduzierbarkeitsfehler. Im Release-Schritt müssen Manifest, `CARD_VERSION`, User-Agent, Frontend-Paket/Lockdatei und README dieselbe freigegebene Version verwenden; vorhandene Versionstests prüfen.
- [ ] README/Release-Notizen beschreiben korrigierte Fälle, neue optionale Entities, alte Daten und gegebenenfalls nötiges Neuladen der Karte. Keine behauptete Astra-Pflichtmigration. Vor Auslieferung Alt-Snapshot im neuen Client und neuen Snapshot im alten Parser auf tolerierte additive Felder prüfen.

**Fertig:** F1–F4 implementiert, relevante Gates mit tatsächlichen Ergebnissen dokumentiert, gebündelte Karte aktualisiert. Veröffentlichung/Commit/Push nur im Rahmen des dann erteilten Auftrags.

## Selbstprüfung dieses Plans

- Paket A ist vollständig zugeordnet; Warnungen, Betriebsoptionen, Visualisierung und zusätzliche Datenquellen sind absichtlich eigene Vorhaben.
- Nullable Reset-Anzahl und dreistufiger Sperrstatus werden durch alle betroffenen Schichten berücksichtigt.
- Kein globaler Umbau der bestehenden Sensor-Extraktoren und keine zusätzliche Laufzeit erforderlich.
- Rollback auf die vorherige Integration erhält bestehende Entity-IDs; neue optionale Registry-Einträge können nach Rücknahme inaktiv bleiben.
- Stunden sind Schätzungen einschließlich Tests, keine Aussage über bereits ausgeführte Implementierung.
