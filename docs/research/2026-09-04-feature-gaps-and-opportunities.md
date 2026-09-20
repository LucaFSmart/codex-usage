# Codex Usage: fehlende Funktionen und Erweiterungsmöglichkeiten

Stand: 4. September 2026, Version 0.6.5, Commit `ba63247`.

> **Aktualisierung:** Der [vollständige Integrations-, HACS- und Architekturabgleich](2026-09-04-comprehensive-peer-and-architecture-audit.md) ist die neuere Gesamtbewertung. Er bestätigt diese lokalen Datenbefunde und ergänzt Statistikklassen, Attributregeln, dynamische Übersetzungen/Identität, Reconfigure, Repairs, Dokumentationsstruktur und aktualisierte Paketsummen.
>
> **Korrektur vom 5. September 2026:** Die Authentifizierung der Enterprise Analytics API ist in den offiziellen Quellen widersprüchlich beschrieben. Der [nachgelagerte Dokumentationsabgleich](2026-09-05-openai-documentation-recheck.md#8-enterprise-analytics-authentication-official-sources-conflict) ersetzt die frühere Festlegung auf einen Platform-Organisationsschlüssel. Alle Quellcodeverweise dieses historischen Berichts zeigen unveränderlich auf den geprüften Commit `ba63247`.

Die wichtigsten nächsten Schritte liegen bei der konsistenten Verarbeitung bereits verfügbarer Daten. Danach folgen bessere Automationen und Auswertungen. Eine zusätzliche Codex-App-Server-Anbindung eröffnet weitere Daten, erhöht aber den Betriebsaufwand erheblich.

Dies ist eine Bestandsaufnahme und Machbarkeitsbewertung, kein freigegebener Implementierungsplan. Anwendungscode und Konten wurden nicht verändert. Aufwand bezeichnet eine relative technische Einschätzung einschließlich gezielter Tests: klein = lokaler Ausbau, mittel = mehrere Schichten, groß = zusätzliche Datenquelle oder Laufzeit.

**Bereits vorhanden – daher keine neuen Features**

- OAuth-Device-Login, Token-Refresh, Reauthentifizierung und Workspace-Auswahl.
- Mehrere Config Entries für Accounts beziehungsweise Benutzer/Workspaces.
- Haupt- und Zusatzlimits, Nutzung/Rest/Reset, generische Fensterdauern.
- Credits, individueller Spend-Control und verfügbare Reset-Anzahl.
- Elf Profilaggregate, darunter Lifetime-Tokens, Peak Daily Tokens, Streaks, Threads, Skills und Reasoning-Anteile.
- Eine Karte mit Account-Wechsel, Gesamtstatus, konfigurierbaren Schwellen, Farben, Detailbereichen und DE/EN.
- Zeitliche Verbrauchseinordnung: wöchentlich als Sensor, für weitere Fenster in der Karte.
- Datenschutzorientierte Diagnostik, Berechtigungsprüfung für Kartendaten und langsamere optionale Abfragen.

Vorhandene aktivierte Sensoren können bereits die Home-Assistant-Historie und Automationen nutzen. Es fehlt kein allgemeines Automationssystem; es fehlen projektspezifische Vorlagen und einige gut nutzbare Sensoren.

**Zuerst beheben: lokal nachvollzogene Datenlücken**

| Befund                                                  | Konkreter Auslöser und Ergebnis                                                                                                                                                                               | Empfohlene Änderung                                                                                                                      | Aufwand      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Zusatzlimit-Sperre geht in Kartendaten verloren         | Hauptlimit gesund, Zusatzlimit `allowed=false`, aber kein `primary_window`/`secondary_window`: Binärsensor meldet ein erreichtes Limit; Kartendaten enthalten nur das gesunde Hauptfenster und keinen Blocker | Limitstatus unabhängig vom Vorhandensein eines Prozentfensters übertragen; betroffene Funktion benennen; keine Prozentwerte erfinden     | Mittel       |
| Reset-Anzahl ist zwischen Sensor und Karte inkonsistent | Usage meldet 4, zwischengespeicherte Reset-Details melden 1: Sensor liefert 4, Karte 1. Ohne Detailantwort zeigt die Karte keinen Reset-Bereich trotz bekannter Anzahl                                        | Gemeinsames normalisiertes Reset-Modell; aktuelle Usage-Anzahl bevorzugen, vorhandene Details ergänzen, Quelle und Alter berücksichtigen | Klein–mittel |
| Alter optionaler Daten fehlt in der Karte               | Usage wird frisch gelesen, Profil/Reset-Daten stammen aus früheren erfolgreichen Abrufen: Kartensnapshot hat nur einen aktuellen Gesamtzeitstempel                                                            | Eigene Zeitstempel und Verfügbarkeitszustände für Usage, Profil und Reset-Details; alte Werte als solche kenntlich machen                | Mittel       |

Fundstellen: [_limits](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/card_data.py#L54), [_account_payload](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/card_data.py#L131), [Limit-Binärsensor](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/binary_sensor.py#L27), [optionale Abfragen](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/coordinator.py#L156), [Kartenstatus](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/frontend/src/view-model.ts#L70).

Die ersten beiden Fälle wurden mit synthetischen Eingaben direkt durch Parser und Kartensnapshot geführt. Der dritte Fall wurde mit sieben Tage alten Metadaten-Zeitstempeln und einem aktuellen Usage-Zeitstempel geprüft. Es handelt sich um reproduzierte Codepfade; ihr Auftreten bei einem bestimmten produktiven Konto wurde nicht geprüft.

Zusätzlich sollte die Statussprache präziser werden: Der heutige allgemeine Limit-Sensor bedeutet „mindestens ein Limit erreicht“. Ein gesperrtes Zusatzfeature beweist nicht, dass alle Modelle beziehungsweise Funktionen unbenutzbar sind. Das ist eine Verbesserung der Produktsemantik, getrennt vom Datenverlust im ersten Befund.

**Ausbau mit vorhandenen Daten**

| Idee                                      | Heute fehlt konkret                                                                                                       | Nutzen / Umsetzung                                                                                                        | Aufwand      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Reset-Ablauf als Sensor                   | `next_expiry` und `total_earned` stehen in der Karte, haben aber keine eigenen Sensoren                                   | Optionalen Timestamp-Sensor und Gesamtzähler anbieten; Warnung vor Ablauf ermöglichen                                     | Klein        |
| Zustand pro Zusatzlimit                   | Zusätzliche Sensoren bieten Nutzung, Rest und Reset, aber keinen eigenen Sperrstatus                                      | Dynamischer Binärsensor je Limit plus klarer Sperrgrund; unbekannten Zustand erhalten                                     | Mittel       |
| Verlässliche Datenfrische                 | Zeitstempel und Fehlerklassen optionaler Abfragen liegen im Coordinator/Diagnose, nicht als normale Diagnose-Entities vor | Sensor „letzte erfolgreiche Abfrage“, getrennte Zustände für optionale Daten; für Automationen nutzbar                    | Klein–mittel |
| Alarm-Blueprints                          | Keine mitgelieferten Vorlagen für Schwellen, Erholung, Reset-Ablauf oder veraltete Daten                                  | Konfigurierbare Aktionen, Schwellen, Ruhezeiten und Entprellung; Nutzer wählt die Benachrichtigungsaktion                 | Mittel       |
| Verbrauchsbudget bis Reset                | Keine Anzeige „so viel pro Tag/Stunde übrig“                                                                              | Rest-Prozentpunkte durch verbleibende Zeit teilen; als Planungsbudget beschriften, nicht als Prognose                     | Klein–mittel |
| Pace für alle Fenster als Sensor          | Für Zusatzfenster nur in der Kartenberechnung verfügbar                                                                   | Generische Sensoren für bekannte Dauern; Einheit „Prozentpunkte“ verständlich erklären                                    | Mittel       |
| Historie in eigener Karte                 | Momentaufnahme und More-Info-Link, kein eigener Verlauf                                                                   | Zunächst vorhandene HA-Historie/Statistik verwenden; Intervalle, Fensterwechsel und Datenlücken zeigen                    | Mittel       |
| Langzeitstatistik für Credits             | `credit_balance`, `spend_used`, `spend_limit`, `spend_remaining` haben keine `state_class`                                | Fachlich passende Statistikklassen ergänzen; Credit-Saldo nicht als monotonen Verbrauch behandeln                         | Klein–mittel |
| Mehrere Accounts gleichzeitig vergleichen | Account-Chips wechseln die Detailansicht; auch `all` rendert keine vollständige Vergleichstabelle                         | Optional kompakte Zeilen je Account; Prozentwerte nicht addieren; gemeinsame Workspace-Credits nicht doppelt summieren    | Mittel       |
| Optionale Datenabrufe abschalten          | Options Flow konfiguriert nur das Usage-Intervall; ausgeblendete Karte/deaktivierter Sensor stoppt Profilabfragen nicht   | Eigene Optionen für Profil und Reset-Metadaten; Anzeige und Erhebung getrennt behandeln                                   | Klein–mittel |
| HTTP-Wartezeiten beachten                 | API-Client übernimmt keine `Retry-After`-Information in den Coordinator                                                   | Falls ein Endpoint den Header liefert: respektieren, begrenztes Backoff und Jitter; Mindestintervall beibehalten          | Mittel       |
| Schemaänderungen erkennbar machen         | Unbekannte Daten werden größtenteils ignoriert                                                                            | Sichere Diagnose zu fehlenden Pflichtstrukturen, Anzahl verworfener Einträge und Schemaform; keine Rohantworten speichern | Mittel       |

Für Reset-Ablauf ist zu beachten: Das früheste Datum der gelieferten Detailzeilen beweist nicht zwingend den vollständigen Bestand. Vor einer Alarmfunktion müssen Verfügbarkeit, Status und Zukunftsdatum ausgewertet werden. Eine ausstehende oder unvollständige Detailantwort darf nicht „keine Resets vorhanden“ bedeuten.

Die vorhandenen Sensorbeschreibungen für Credit-/Spend-Werte wurden lokal geprüft: Die genannten vier `state_class`-Werte sind `None`. Home Assistant verlangt eine geeignete Klasse für Langzeitstatistiken. Klassische Recorder-Historie ist davon getrennt. [HA-Sensordokumentation](https://developers.home-assistant.io/docs/core/entity/sensor/#long-term-statistics).

Blueprints sind ein passender Weg für wiederverwendbare Automationen. Numerische Trigger reagieren auf das Überschreiten einer Schwelle; Neustart-, Wiederverbindungs- und bereits-kritisch-Fälle benötigen zusätzlich eine bewusst definierte Behandlung. [Blueprints](https://www.home-assistant.io/docs/blueprint/tutorial/), [Numeric State](https://www.home-assistant.io/triggers/numeric_state/).

Weitere Codebasis: [Sensoren](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/sensor.py#L106), [Options Flow](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/config_flow.py#L245), [Kartenrendering](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/frontend/src/codex-usage-card.ts#L610), [HTTP-Client](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/api.py#L785). Die installierte HA-Version unterstützt bereits `UpdateFailed(retry_after=...)`; die Integration verwendet diesen Parameter nicht.

**Zusätzliche Datenquellen: dokumentiert, aber nicht angebunden**

| Möglichkeit                     | Öffentliche Schnittstelle                                     | Bewertung                                                                                                     |
| ------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Tages-Tokenstatistiken          | App Server `account/usage/read`, optional `dailyUsageBuckets` | Hoher Nutzwert für Tages-/Wochenansichten; großer Ausbau gegenüber aktuellem Direkt-HTTP-Client               |
| Limit-Updates als Ereignisse    | `account/rateLimits/updated`                                  | Alternative zu Polling; keine Zusage, dass alle kontoexternen Aktivitäten sofort gemeldet werden              |
| Modell-/Capability-Übersicht    | `model/list`                                                  | Client-Modellkatalog anzeigen; kein Verbrauchsnachweis und keine garantierte kontoübergreifende Verfügbarkeit |
| Workspace-Hinweise              | `account/workspaceMessages/read`                              | Optionaler Infobereich; freie Texte und Berechtigungen gesondert berücksichtigen                              |
| Resets auslösen                 | `account/rateLimitResetCredit/consume`                        | Bewusst bislang ausgeschlossen: zustandsändernde Funktion                                                     |
| Workspace-Owner benachrichtigen | `account/sendAddCreditsNudgeEmail`                            | Versandaktion; passt nicht zum bisherigen reinen Monitor                                                      |

Diese Methoden sind im [Codex App Server](https://learn.chatgpt.com/docs/app-server) beschrieben. Das Protokoll bietet `stdio`; sein WebSocket-Transport ist ausdrücklich experimentell und nicht für Produktion unterstützt. Öffentliche Dokumentation macht ihn damit nicht automatisch zum stabileren Ersatz unserer bisherigen Anbindung.

Mein Vorschlag für eine Erprobung wäre ein optionaler, getrennt betriebener Adapter, der nur normalisierte Monitoringdaten bereitstellt. Zu lösen sind insbesondere Laufzeitinstallation, Authentifizierung, Auswahl des richtigen Accounts, Wiederverbindung und Versionierung. Ein neuer WHAM-HTTP-Pfad für die Tagesdaten lässt sich aus den RPC-Namen nicht ableiten.

Für Workspace-Reporting existiert außerdem die Codex Analytics API. Die offiziellen Quellen widersprechen sich bei der erforderlichen Anmeldeart. Konkrete Zugangsdaten, Metriken, Berechtigungen und Datenlatenzen müssten vor Implementierung anhand einer verifizierten Referenz und eines berechtigten Testkontos bestätigt werden. [Dokumentationsabgleich vom 5. September 2026](2026-09-05-openai-documentation-recheck.md#8-enterprise-analytics-authentication-official-sources-conflict).

Für API-Key-Kosten gibt es die separaten Platform-Routen `/v1/organization/usage/completions` und `/v1/organization/costs`. Eine Anbindung wäre technisch eine eigene Datenquelle mit anderer Abrechnung. [Platform Usage API](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage).

**Ideen, für die die heutige Datenbasis nicht reicht**

- Exakter Verbrauch beziehungsweise Kosten je Modell, Projekt oder Aufgabe: Die aktuell normalisierten Kontingent- und Profilwerte enthalten diese Aufteilung nicht.
- Exakte Zahl verbleibender Prompts oder Tokens: Aus dem Kontingent-Prozentsatz nicht belastbar ableitbar.
- Exakte Credit-Ausgaben allein aus sinkendem Saldo: Aufladungen, Korrekturen und mehrere Nutzungsquellen können die Differenz verändern.
- Sichere Vorhersage des nächsten Limitzeitpunkts: Benötigt ausreichend Verlauf und ein überprüftes Verständnis der Fenster. Eine lineare Rechnung aus einer Momentaufnahme ist nur eine Annahme.
- Vollständige historische Tageswerte allein aus stündlich abgefragten Lifetime-Tokens: Differenzen wären Beobachtungsintervalle mit möglicher Verzögerung, keine verifizierten Kalendertage.

Lokale Codex-Logs könnten für einzelne dieser Ideen zusätzliche Daten liefern, würden aber einen Collector und einen eigenen Datenschutz-/Vollständigkeitsvertrag benötigen. In dieser Prüfung wurde ihre Eignung nicht verifiziert.

**Empfohlene Reihenfolge**

1. Datenkonsistenz: fensterlose Zusatzlimit-Sperren, gemeinsame Reset-Anzahl, getrennte Datenfrische.
2. Direkter Alltagsnutzen: Reset-Ablauf- und Diagnose-Sensoren, optionales Polling, Alarm-Blueprints.
3. Auswertung: Credit-Langzeitstatistik, Verlauf in der Karte, Planungsbudget, Account-Vergleich.
4. Separater Machbarkeitsschritt: Tages-Tokenstatistiken über eine zusätzliche Datenquelle. App Server zunächst optional erproben.
5. Nur bei eigenem Produktbedarf: Workspace-Analytics oder API-Key-Kosten. Reset-Aktionen und E-Mail-Versand würden die bisherige Read-only-Zusage bewusst ändern.

Für die nächste Version würde ich Paket 1 plus Reset-Ablauf-Sensor und einen Alarm-Blueprint wählen. Diese Kombination behebt nachgewiesene Inkonsistenzen und bringt einen sichtbaren Nutzen, ohne einen zusätzlichen Codex-Prozess vorauszusetzen.

**Prüfgrenzen**

Untersucht wurden die öffentlichen OpenAI-/Home-Assistant-Dokumente, alle wesentlichen Daten-, Sensor-, Konfigurations- und Kartenschichten sowie relevante vorhandene Tests. Neue synthetische Probes haben die drei oben beschriebenen Datenfälle und die fehlenden Statistikklassen nachgewiesen. Die Probe lief ohne Netzwerkzugriff auf Nutzerkonten.

Die 107 Backend- und 56 Frontend-Tests aus der vorhergehenden Astra-Prüfung wurden in diesem Schritt nicht erneut ausgeführt. Es wurde kein UI-Browsertest und kein produktiver HA-/App-Server-/Enterprise-Zugriff durchgeführt. Die Bestandsaufnahme beansprucht keine vollständige Erfassung aller undokumentierten WHAM-Felder.
