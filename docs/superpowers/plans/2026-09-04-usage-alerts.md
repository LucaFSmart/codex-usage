# Usage Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen importierbaren Blueprint anbieten, der pro kritischer Nutzungsphase einmal eine vom Nutzer ausgewählte Aktion ausführt.

**Architecture:** Home-Assistant-Automation mit vorhandenem Prozent-Sensor und einem eigenen `input_boolean` als gespeichertem Warnzustand. Keine neue API-Abfrage, kein Dienst innerhalb der Integration und keine automatische Aktivierung.

**Tech Stack:** Home Assistant Blueprint/YAML/Jinja, Python 3.14 und vorhandene Linux-Testumgebung.

**Spec:** `docs/research/2026-09-04-feasibility-and-roadmap.md`, A1. Aufwand 6–10 h. Unabhängig von F1–F5 implementierbar; bestehende Usage-Sensoren reichen aus.

## Global Constraints

- Home Assistant mindestens 2026.3.0; vorhandene CI-Prüfung mit 2026.8.3 beibehalten.
- Kein neuer externer Laufzeitdienst und keine neue Python- oder Frontend-Abhängigkeit im ersten Paket.
- Keine neuen kontoverändernden Aktionen; Blueprint-Aktionen werden ausschließlich vom Nutzer konfiguriert.
- Bestehende Entity-Unique-IDs und Historien bleiben erhalten; neue optionale Sensoren standardmäßig deaktiviert.
- DE/EN-Texte gemeinsam pflegen; unbekannte Werte nicht in null Prozent oder null Guthaben umwandeln.
- Bestehende Usage- und optionale Abrufintervalle im ersten Paket beibehalten.

Keine Automation auf einem Nutzerkonto aktivieren und keine Testnachrichten an externe Dienste senden. Die hier beschriebene Aktion wird nur innerhalb einer lokalen HA-Testinstanz durch einen Testdienst ersetzt. Veröffentlichung/Push sind getrennte Schritte. Für tatsächliche Umsetzung aktuellen Projektstand gegen `ba63247` prüfen.

## Dateien und Schnittstelle

- Neu `blueprints/automation/codex_usage/usage_warning.yaml`: eigenständig importierbare Vorlage.
- Neu `tests_integration/test_blueprint_alerts.py`: echte HA-Automationsausführung mit Testaktion.
- Ändern `.github/workflows/validate.yml`: neuen Test im Linux-Smoke-Job aufrufen.
- Ändern `README.md`: Import, Konfiguration, Rücksetzen und Grenzen erklären.

Blueprint-Inputs: `usage_entity` (Sensor mit Prozent-Einheit), `warning_threshold` (1–100, Standard 80), `hysteresis` (1–50 Prozentpunkte, Standard 5), `warned_helper` (eigener `input_boolean` je Automation), `warning_action` (Action-Selector). Zustände: unbekannt → keine Aktion; unter Rücksetzschwelle → Helper aus; ab Warnschwelle und Helper aus → Aktion, danach Helper an; dazwischen → bisherigen Zustand behalten.

## Task 1 — Blueprint und ausführbare Verhaltensprüfung (4–7 h)

- [ ] Linux-Test zunächst so anlegen, dass er die neue Blueprint-Datei lädt, Inputs substituiert und über `async_setup_component(hass, "automation", ...)` ausführt. Fehlende Datei vor Erstellung als erwartetes Scheitern bestätigen. Reale Automation testen, keine zweite Python-Implementierung der Entscheidungsregeln bauen.
- [ ] Datei mit folgendem Inhalt erstellen. Texte sind für den importierten Blueprint zweisprachig; keine von HACS automatisch installierte Lokalisierung voraussetzen.

```yaml
blueprint:
  name: Codex Usage — Nutzungswarnung / Usage warning
  description: >-
    Warnt einmal je kritischer Phase. Eigener Toggle-Helper pro Automation nötig.
    Warns once per critical period. Use a separate toggle helper for each automation.
    Unbekannte Werte lösen keine Aktion aus. Unknown values do not trigger actions.
  domain: automation
  homeassistant:
    min_version: "2026.3.0"
  input:
    usage_entity:
      name: Nutzungssensor (%) / Usage sensor (%)
      selector:
        entity:
          domain: sensor
    warning_threshold:
      name: Warnschwelle (%) / Warning threshold (%)
      default: 80
      selector:
        number:
          min: 1
          max: 100
          step: 1
          unit_of_measurement: "%"
    hysteresis:
      name: Abstand zum Rücksetzen / Recovery margin
      description: Prozentpunkte / Percentage points
      default: 5
      selector:
        number:
          min: 1
          max: 50
          step: 1
    warned_helper:
      name: Warnzustand-Helper / Warning state helper
      description: >-
        Eigener Toggle-Helper; ohne erzwungenen Initialwert konfigurieren.
        Separate toggle helper; do not force an initial value.
      selector:
        entity:
          domain: input_boolean
    warning_action:
      name: Aktion bei Warnung / Warning action
      selector:
        action: {}

mode: single
max_exceeded: silent

triggers:
  - trigger: state
    entity_id: !input usage_entity
  - trigger: homeassistant
    event: start
  - trigger: time_pattern
    minutes: "/5"

variables:
  usage_entity: !input usage_entity
  warned_helper: !input warned_helper
  warning_threshold: !input warning_threshold
  hysteresis: !input hysteresis

conditions:
  - condition: template
    value_template: >-
      {{ is_number(states(usage_entity))
         and state_attr(usage_entity, 'unit_of_measurement') == '%'
         and 0 <= states(usage_entity) | float(-1) <= 100
         and states(warned_helper) in ['on', 'off'] }}

actions:
  - choose:
      - conditions:
          - condition: template
            value_template: >-
              {{ states(usage_entity) | float >= warning_threshold | float
                 and is_state(warned_helper, 'off') }}
        sequence:
          - sequence: !input warning_action
          - action: input_boolean.turn_on
            target:
              entity_id: !input warned_helper
      - conditions:
          - condition: template
            value_template: >-
              {{ states(usage_entity) | float <=
                   [0, (warning_threshold | float) - (hysteresis | float)] | max
                 and is_state(warned_helper, 'on') }}
        sequence:
          - action: input_boolean.turn_off
            target:
              entity_id: !input warned_helper
```

Die numerischen Vergleiche müssen in der HA-Mindestversion validiert werden. Bei Warnschwelle 80/Hysterese 5 bedeutet 80 Warnung und 75 Rücksetzen. Ist der Helper unbekannt, wird nichts ausgeführt. Eine fehlgeschlagene Benutzeraktion verhindert das anschließende Setzen des Helpers; damit ist ein erneuter Versuch nach spätestens fünf Minuten möglich. Aktionen sollten keine unbegrenzt laufenden Warteschritte enthalten.

- [ ] Integrationstest mit folgendem ausführbaren Kern aufbauen; der registrierte Dienst zählt nur lokal und sendet nichts:

```python
from pathlib import Path

from homeassistant.core import callback
from homeassistant.setup import async_setup_component
from homeassistant.util import yaml as yaml_util

pytest_plugins = "pytest_homeassistant_custom_component"


async def test_warning_requires_recovery_before_second_action(hass):
    calls = []

    @callback
    def record_warning(call):
        calls.append(call)

    hass.services.async_register("codex_test", "record_warning", record_warning)
    await async_setup_component(
        hass,
        "input_boolean",
        {
            "input_boolean": {"codex_warned": {"name": "Warned"}},
        },
    )
    await hass.services.async_call(
        "input_boolean", "turn_off", {"entity_id": "input_boolean.codex_warned"}, blocking=True
    )

    path = Path(__file__).parents[1] / "blueprints/automation/codex_usage/usage_warning.yaml"
    document = await hass.async_add_executor_job(yaml_util.load_yaml, str(path))
    config = yaml_util.substitute(
        document,
        {
            "usage_entity": "sensor.codex_test_usage",
            "warning_threshold": 80,
            "hysteresis": 5,
            "warned_helper": "input_boolean.codex_warned",
            "warning_action": [{"action": "codex_test.record_warning"}],
        },
    )
    config.pop("blueprint")
    config["alias"] = "Codex test warning"
    hass.states.async_set("sensor.codex_test_usage", "70", {"unit_of_measurement": "%"})
    await async_setup_component(hass, "automation", {"automation": [config]})
    await hass.async_block_till_done()

    for value, expected_calls in [(80, 1), (90, 1), (78, 1), (75, 1), (81, 2)]:
        hass.states.async_set("sensor.codex_test_usage", str(value), {"unit_of_measurement": "%"})
        await hass.async_block_till_done()
        assert len(calls) == expected_calls
```

- [ ] Blueprint-Metadaten zusätzlich durch HA-Blueprint-Schema validieren, nicht nur die substituierte Automation. `Blueprint(document, expected_domain="automation", schema=AUTOMATION_BLUEPRINT_SCHEMA)` verwenden, mit Importen aus `homeassistant.components.blueprint.models` und `homeassistant.components.automation.config`. Für die Script-/Template-Schemavalidierung innerhalb des laufenden HA-Test-Event-Loops bleiben. Dadurch lässt sich eine versehentlich ungültige Importvorlage erkennen.
- [ ] Separate Verhaltensfälle in derselben Testdatei ergänzen:

| Fall                           | Eingabe/Aktion                                                                      | Exakte Erwartung                                          |
| ------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Unbekannt                      | Nach Warnung Zustand `unknown`, dann `unavailable`, dann `85`                       | Eine Aktion insgesamt; Helper bleibt an                   |
| Bereits kritisch bei Start     | Sensor vor Automationsstart `85`, Helper aus; HA-Start-Ereignis auslösen            | Eine Aktion und Helper an                                 |
| Neustart mit gewarntem Zustand | Wiederhergestellten Helper an vorbelegen; Sensor `85`; Start auslösen               | Keine Aktion                                              |
| Fehlerhafte Aktion             | Testdienst wirft `HomeAssistantError`, danach Wiederholung mit erfolgreichem Dienst | Helper zuerst aus; nach erfolgreichem Versuch an          |
| Ungültige Einheit              | Sensor `85` mit Einheit `credits`                                                   | Keine Aktion                                              |
| Ungültiger Zahlenbereich       | Werte `-1`, `101`, `nan`                                                            | Keine Aktion                                              |
| Takt bei unverändertem Wert    | Sensor `85`, Helper aus; Zeit bis nächstem Fünf-Minuten-Takt vorspulen              | Eine Aktion; weitere Takte keine zusätzliche              |
| Zweite Instanz                 | Zwei Sensoren, zwei Helper, beide `85`                                              | Eine Aktion pro Instanz; keine gegenseitige Unterdrückung |

Für Zeit/Neustart vorhandene `pytest-homeassistant-custom-component`-Hilfen verwenden und auf abgeschlossene Event-Verarbeitung warten. Helper-Wiederherstellung getrennt mit Restore-State-Fixture prüfen; manuelles `turn_on` allein belegt keinen Persistenztest.

- [ ] Unter Linux ausführen: `pytest tests_integration/test_blueprint_alerts.py -v -o asyncio_mode=auto`. Erst danach den Linux-Smoke-Job um diese Datei erweitern. Gegen HA 2026.3.0 und 2026.8.3 prüfen; eine Versionsmatrix für den Linux-Job verwenden, falls beide bisher nicht dort laufen. Keine neuen Abhängigkeiten über die bereits eingesetzte HA-Testumgebung hinaus.

**Abnahme:** Warnung bei gültiger aktueller Zahl, kein Spam bei unverändert kritischem Zustand, kein Zustandsverlust durch unbekannte Sensordaten; Start, Wiederherstellung und Aktionsfehler sind geprüft.

## Task 2 — Import und Bedienung dokumentieren (2–3 h)

- [ ] README um DE/EN-Abschnitt ergänzen: „Einstellungen → Geräte & Dienste → Helfer → Schalter“ anlegen, pro Automation eigener Helper; keinen fest erzwungenen Initialwert konfigurieren. Prozent-Nutzungssensor auswählen, beispielsweise Wochen-Nutzung, nicht Rest-Prozent oder Credit-Saldo. Die Schwelle bezieht sich auf **verbrauchten** Anteil.
- [ ] Den tatsächlichen Repositorypfad dokumentieren: `blueprints/automation/codex_usage/usage_warning.yaml`. Für späteren Import ist `https://github.com/LucaFSmart/codex-usage/blob/main/blueprints/automation/codex_usage/usage_warning.yaml` vorgesehen. Der Link wird erst nach Veröffentlichung der Datei gültig; im Release auf Existenz prüfen und bevorzugt eine dann tatsächlich vorhandene Release-Referenz verlinken. Keinen erfundenen Tag einsetzen.
- [ ] Nutzer wählt im Action-Selector die gewünschte Aktion. Beispieltext: „Codex: Der gewählte Nutzungssensor hat die Warnschwelle erreicht.“ Keine vorgewählte externe Empfängeradresse und kein versteckter Notification-Dienst.
- [ ] Grenzen erklären: Import ist separat zur HACS-Installation; Blueprint-Updates benötigen bewusste Aktualisierung. HA-Ausfälle können Benachrichtigungen verzögern. Wiederhergestellter Warnzustand kann eine erneute Warnung nach einer vollständig unbeobachteten Erholung unterdrücken; manuelles Rücksetzen des Helpers ist der nachvollziehbare Ausweg. Keine Garantie exakt einmaliger externer Zustellung bei Absturz zwischen Aktion und Helper-Update.
- [ ] Import der veröffentlichten Vorlage erst im Release-Kontext prüfen. Lokale Import-/Schema-Prüfung und tatsächliche Veröffentlichung getrennt berichten. Rollback: Automation deaktivieren/entfernen; bestehende Integration und Sensoren bleiben unverändert. Helper nur entfernen, wenn keine Automation ihn mehr nutzt.

**Fertig:** Importierbare lokale Vorlage, bestandene Verhaltens-/Schema-Prüfung, dokumentierte Einrichtung. Keine automatische Aktivierung und keine versendeten Nachrichten.

## Selbstprüfung

Die Vorlage benötigt F4 nicht; damit kann sie unabhängig geliefert werden. Hysterese ersetzt einen unzuverlässigen, bei Neustart verlorenen `for`-Timer. Ein Helper je Instanz ist eine sichtbare Einrichtungskostenentscheidung. Ablaufwarnungen, Ruhezeiten und wiederkehrende Erinnerungen sind weitere Features und nicht im Aufwand A1 enthalten.

Prüfung des Planentwurfs am 4. September 2026: YAML sowie Blueprint-, Script- und Bedingungsschema unter HA 2026.8.3 gültig. Keine Automation gestartet und kein Dienst ausgeführt. Die aufgeführten Verhaltens- und Mindestversionstests bleiben Implementierungsgates.
