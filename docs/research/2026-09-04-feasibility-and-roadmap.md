# Codex Usage: Machbarkeit, Aufwand, Nutzen und Umsetzungsempfehlung

Stand: 4. September 2026. Untersuchte Basis: Version 0.6.5, Commit `ba63247`.

> **Aktualisierung:** Der spätere [vollständige Integrations- und HACS-Abgleich](2026-09-04-comprehensive-peer-and-architecture-audit.md) erweitert diese Untersuchung um Entity-/Attributmuster, Statistikklassen, dynamische Namen, Reconfigure, Repairs und Dokumentationsstruktur. Seine Paketabgrenzung und Aufwandssummen sind der aktuelle Gesamtentscheid; die Detailregeln dieses Dokuments bleiben gültig.

**Empfehlung:** Zuerst die drei nachgewiesenen Dateninkonsistenzen beseitigen, zusätzliche Metadaten als Sensoren anbieten und eine Warnvorlage liefern. Dieses Paket benötigt geschätzt **26–42 Entwicklungsstunden**, mit 25 % Reserve **33–53 Stunden**. Das entspricht etwa **4–7 Arbeitstagen à acht Stunden**, ohne Zusage eines Kalendertermins. Eine zusätzliche App-Server-Anbindung sollte zunächst einen begrenzten Machbarkeitstest bestehen.

Dies ist eine technische Untersuchung und ein vorgeschlagener Arbeitsumfang. Anwendungscode, Konten und installierte Laufzeiten wurden nicht geändert. Die Schätzung setzt eine mit Python, Home Assistant und Lit vertraute Person voraus. Sie enthält Implementierung, gezielte Tests, Dokumentation und Release-Prüfung; Wartezeiten auf Zugang, Produktfreischaltung und externe Reviews sind nicht enthalten. Ein finanzieller ROI lässt sich ohne Nutzungszahlen und Stundensatz nicht seriös berechnen.

## 1. Was belastbar bekannt ist

Die Integration ist ein lesender Kontingentmonitor. Sie verwendet vier WHAM-GET-Endpunkte für Usage, Profil, Accountauswahl und Reset-Guthaben. Sie führt keine Modellantworten aus. OAuth-Anmeldung und Token-Erneuerung bleiben hiervon getrennte Authentifizierungsvorgänge. Die Astra-Untersuchung hat keinen durch Astra zwingend erforderlichen Umbau dieser Datenabfragen belegt. Modellsteuerung, Tool Calling und Tokenpreise sind deshalb kein Pflichtumfang dieses Plans.

Die [Astra-Prüfung](2026-09-04-gpt-6-astra-integration-audit.md) dokumentiert die öffentlichen Quellen; der [Funktionsabgleich](2026-09-04-feature-gaps-and-opportunities.md) beschreibt vorhandene Funktionen und konkrete Fundstellen.

| Evidenz                                     | Befund                                                                                                                                | Aussagekraft                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Lokaler synthetischer Parser-/Snapshot-Test | Ein gesperrtes Zusatzlimit ohne Prozentfenster erreicht den Binärsensor, fehlt aber in der Karte                                      | Reproduzierbarer Fehlerpfad; Auftreten bei einem realen Konto nicht geprüft          |
| Lokaler synthetischer Snapshot-Test         | Usage-Anzahl 4 und zwischengespeicherte Reset-Anzahl 1 führen zu unterschiedlichen Anzeigen; ohne Detaildaten fehlt der Kartenbereich | Reproduzierbare Inkonsistenz                                                         |
| Lokaler synthetischer Snapshot-Test         | Sieben Tage alte Profil-/Reset-Daten erscheinen zusammen mit aktuellem Usage-Zeitstempel ohne eigenes Alter                           | Nachgewiesene Informationslücke                                                      |
| Codeprüfung                                 | Vier Credit-/Spend-Sensoren haben keine `state_class`; Options Flow bietet nur das Usage-Intervall                                    | Konkrete Ausbaupunkte; vorhandene Recorder-Historie und Automationen bleiben nutzbar |
| Lokale Schemaerzeugung                      | CLI 0.120.0 beschreibt `account/rateLimits/read` und `model/list`, aber nicht `account/usage/read`                                    | Die lokal installierte CLI ist kein bestätigter Träger der gewünschten Tagesdaten    |

**Neue Erkenntnis zur App-Server-Machbarkeit:** Die öffentliche Dokumentation beschreibt `account/usage/read` mit optionalen Tageswerten. Der separat installierte Client `codex-cli 0.120.0` enthält diese Methode weder im regulären noch im experimentellen erzeugten Request-Schema. Das betrifft diese CLI, nicht automatisch die Codex-Desktop-App oder alle veröffentlichten Builds. Ein Live-Aufruf wurde nicht ausgeführt; die fehlende Schemaunterstützung genügt als Sperre für eine Produktionsplanung auf dieser Version. [Offizielle App-Server-Dokumentation](https://learn.chatgpt.com/docs/app-server).

Reproduzierbarer, kontofreier Befund:

```powershell
codex --version
$schemaDir = Join-Path $env:TEMP 'codex-usage-feasibility-20260904\cli-schema'
$experimentalDir = Join-Path $env:TEMP 'codex-usage-feasibility-20260904\cli-schema-experimental'
codex app-server generate-json-schema --out $schemaDir
codex app-server generate-json-schema --experimental --out $experimentalDir
rg -n 'account/usage/read|account/rateLimits/read|model/list' $schemaDir $experimentalDir
```

SHA-256 von `ClientRequest.json`: regulär `E52219F53BEB9F14284434A08E70ED7B67FC2FD06BD1F0BDF8218BBA8A8D6F4F`, experimentell `925DE3C75A2700677D978AA47634344A6817B39DF04DB6B597114AC62B4AFEBE`. Die Dateien liegen im genannten lokalen Temp-Verzeichnis. Es wurden keine Zugangsdaten gelesen oder in diese Artefakte übernommen.

## 2. Priorisierte Bewertung

Aufwand in Personenstunden einschließlich der jeweils zugehörigen Tests. Gemeinsame Release-Prüfung ist bei F5 enthalten. Nutzen ist eine technische Produktbewertung, keine gemessene Nutzernachfrage. „Hoch“ bedeutet hier korrekte Entscheidungen oder deutlich weniger manuelles Kontrollieren; „mittel“ bedeutet bessere Auswertung oder Betriebssteuerung.

| ID  | Maßnahme                                                                    | Machbarkeit und Abhängigkeit                                    | Nutzen                                            |            Aufwand | Empfehlung                      |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------- | -----------------: | ------------------------------- |
| F1  | Gemeinsame Reset-Anzahl und konservative Ablaufberechnung                   | Hoch, bestehende Daten; fehlende Anzahl muss unbekannt bleiben  | Hoch: widerspruchsfreie Anzeige                   |              4–6 h | Sofort                          |
| F2  | Zusatzlimitstatus auch ohne Fenster, präzisere Sperrtexte                   | Hoch, Parser liefert Status bereits                             | Hoch: verhindert irreführend gesunde Karte        |              4–6 h | Sofort                          |
| F3  | Quellenalter und Fehlerzustände in der Karte                                | Hoch, Zeitstempel existieren bereits im Coordinator             | Hoch: alte Daten werden erkennbar                 |              5–8 h | Sofort                          |
| F4  | Nächster bekannter Reset-Ablauf und letzte erfolgreiche Abrufe als Sensoren | Hoch, nach F1/F3                                                | Mittel–hoch: Automationen können darauf reagieren |              3–5 h | Erstes Paket                    |
| F5  | Gemeinsame Regression, Übersetzungen, Bundle und Release-Prüfung            | Hoch, bestehende CI; echter HA-Smoke-Test unter Linux           | Hoch: schützt bestehende Installationen           |              4–7 h | Pflicht für F1–F4               |
| A1  | Warn-Blueprint mit Hysterese und gespeichertem Warnzustand                  | Hoch, bestehende Usage-Sensoren; Nutzer wählt Aktion und Helper | Hoch: weniger manuelles Nachsehen                 |             6–10 h | Erstes Paket                    |
| R1  | Profil-/Reset-Detailabfragen abschaltbar                                    | Hoch; bestehende Abrufplanung und Options Flow erweitern        | Mittel: Kontrolle über optionale Datenerhebung    |              4–6 h | Danach                          |
| R2  | `Retry-After` für 429/503 berücksichtigen                                   | Hoch, aber Headertransport und HA-Mindestversion testen         | Mittel: robuster bei serverseitiger Drosselung    |              4–8 h | Danach                          |
| R3  | Eigener Binärsensor je Zusatzlimit                                          | Hoch, nach F2; Entdeckung/Wiederladen stabil halten             | Mittel–hoch bei mehreren Funktionen               |              4–6 h | Bei Bedarf an gezielten Alarmen |
| R4  | Sichere Diagnose von Schemaabweichungen                                     | Hoch für Strukturmerkmale, keine Vollständigkeitsgarantie       | Mittel: Fehler schneller einordnen                |              4–8 h | Danach                          |
| V1  | Langzeitstatistik für Credit-/Spend-Werte                                   | Hoch; fachliche Bedeutung vor Statistikklasse prüfen            | Mittel                                            |              3–5 h | Vor eigener Verlaufskarte       |
| V2  | Restbudget pro Stunde/Tag bis Reset                                         | Hoch bei gültigem Resetzeitpunkt                                | Mittel: einfache Nutzungsplanung                  |              3–5 h | Kleine optionale Ergänzung      |
| V3  | Verlauf in der eigenen Karte                                                | Mittel; HA-Historie/Berechtigungen, Lücken und Aggregation      | Mittel; HA-Historie existiert bereits             |            12–20 h | Erst nach Nutzerbedarf          |
| V4  | Vergleich mehrerer Accounts in einer Ansicht                                | Hoch; vorhandene Snapshots, zusätzlicher Kartenmodus            | Mittel für Mehrkonto-Nutzer                       |             6–10 h | Optional                        |
| D1  | Tagesdaten: begrenzter Kompatibilitäts-/Datenversuch                        | Offen bis passende Runtime und geeigneter Kontozugang vorliegen | Potenziell hoch                                   |              4–8 h | Nur Erprobung einplanen         |
| D2  | Separater App-Server-Adapter samt HA-Anbindung                              | Bedingt; nur nach bestandenem D1                                | Hoch bei verifizierten Tagesdaten                 | 40–72 h zusätzlich | Zurückstellen                   |

**Paketsummen ohne doppelte Zählung:** F1–F5 = 20–32 h; A1 = 6–10 h; R1–R4 = 16–28 h; V1–V4 = 24–40 h. D1+D2 = 44–80 h vor Reserve, sofern D1 erfolgreich ist. Diese letzte Spanne ist wegen der ungeklärten Laufzeit-/Kontoverfügbarkeit deutlich unsicherer. Sie enthält einen einzelnen unterstützten Adapter-Betriebsweg, keine universelle Installation für alle HA-Umgebungen.

Weitere Ideen gehören in getrennte Produktentscheidungen:

- **Pace-Sensoren für alle Fenster:** 4–6 h; technisch gut machbar. Nach V2 prüfen, ob zusätzliche Entities gegenüber der vorhandenen Kartenanzeige einen realen Automationsnutzen haben.
- **Reset-Ablauf- und Datenfrische-Blueprints:** jeweils etwa 4–6 h nach F4. Zuerst A1 ausliefern und die tatsächliche Sensorverfügbarkeit bewerten.
- **Modellübersicht:** etwa 6–10 h nach D2; der Modellkatalog beweist weder Verbrauch noch garantierten Zugang. Kein Grund, D2 allein dafür zu bauen.
- **Workspace-Hinweise:** etwa 6–12 h nach bestätigter Methode; freie Texte und Sichtbarkeit benötigen eigene Regeln. Im lokal erzeugten CLI-Schema ebenfalls nicht vorhanden.
- **Enterprise-Analytics:** zuerst 4–8 h Vertrags-/Zugangstest, danach vorläufig 24–48 h für eine eng begrenzte Integration. Die offiziellen Quellen widersprechen sich bei der erforderlichen Anmeldeart; konkrete Zugangsdaten, Felder und Testzugang sind noch nicht verifiziert. [Dokumentationsabgleich vom 5. September 2026](2026-09-05-openai-documentation-recheck.md#8-enterprise-analytics-authentication-official-sources-conflict).
- **Platform-API-Kosten:** vorläufig 24–40 h als eigenständige Datenquelle, nach Schema-/Berechtigungstest. Eigene Schlüssel, Abrechnung und Zuordnung; keine Vermischung mit ChatGPT-Kontingenten. [Usage API](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage).
- **Resets auslösen oder E-Mails versenden:** derzeit nicht empfohlen. Dies würde das Produktversprechen eines lesenden Monitors ändern; kein Bestandteil dieser Aufwandssummen.

## 3. Technischer Entwurf für das erste Paket

### Verbindliche Rahmenbedingungen

- Home Assistant mindestens 2026.3.0; vorhandene CI-Prüfung mit 2026.8.3 beibehalten.
- Python 3.14, bestehendes aiohttp-/Coordinator-Muster; Frontend Lit/TypeScript/Vite.
- Kein neuer externer Laufzeitdienst und keine neue Python- oder Frontend-Abhängigkeit im ersten Paket.
- Keine neuen kontoverändernden Aktionen; Blueprint-Aktionen werden ausschließlich vom Nutzer konfiguriert.
- Bestehende Entity-Unique-IDs und Historien bleiben erhalten; neue optionale Sensoren standardmäßig deaktiviert.
- Kartenprotokoll `schema_version: 1` nur additiv erweitern; neuer Client akzeptiert fehlende Zusatzfelder aus alten Snapshots.
- Keine Rohantworten, Tokens, Account-Backend-IDs oder Fehlertexte in Kartendaten aufnehmen; bestehende Berechtigungsprüfung beibehalten.
- DE/EN-Texte gemeinsam pflegen; unbekannte Werte nicht in null Prozent oder null Guthaben umwandeln.
- Bestehende Usage- und optionale Abrufintervalle im ersten Paket beibehalten.

### F1: Eine gemeinsame Reset-Auswertung

Eine kleine reine Funktion in `custom_components/codex_usage/monitoring.py` verarbeitet Usage, Detaildaten, den Zeitpunkt des letzten erfolgreichen Detailabrufs und die aktuelle Uhrzeit. Sensor und Karte benutzen dasselbe Ergebnis. Sie erzeugt keine zusätzliche Netzwerkabfrage.

Festgelegte Produktregeln:

1. Eine gültige Usage-Anzahl hat Vorrang, einschließlich `0`. Das ist unsere Konsistenzregel, keine behauptete serverseitige Rangordnung.
2. Fehlt sie, ist eine explizit gemeldete Detail-Anzahl nur bei höchstens 7.200 Sekunden alten Details nutzbar. Fehlende/ungültige Anzahl ist `None`, nicht `0`; dazu den bisherigen Parser korrigieren.
3. Anzahl niemals aus der Zahl der Detailzeilen rekonstruieren.
4. Ablauf nur aus zukünftigen Zeilen mit bekanntem Status `available`, nur bei aktuellen Details, positivem Bestand und übereinstimmenden gemeldeten Anzahlen. Unbekannte Statuswerte bleiben ohne Ablaufableitung. Der Status ist in vorhandenen Fixtures belegt, nicht als vollständiger öffentlicher WHAM-Vertrag.
5. Name immer „Nächster bekannter Reset-Ablauf“: Das kleinste gelieferte Datum beweist keine vollständige Liste. Bei widersprüchlichen Zahlen ist der Ablauf unbekannt.
6. Gesamtanzahl erhaltener Resets nur aus aktuellen Details anzeigen. Dafür im ersten Paket keinen monotonen Statistikzähler versprechen.

Geplante Ausgabe: `available_count`, `total_earned`, `next_known_expiry`, `count_source` (`usage`, `details`, `unknown`), `details_consistent`. Die bisherigen Kartenfelder `available_count`, `total_earned`, `next_expiry` bleiben erhalten; zusätzliche Herkunftsangaben erklären das Ergebnis.

### F2: Zustand unabhängig vom Prozentfenster

Ein additives `limit_statuses`-Array überträgt `id`, `name`, `source` und `reached` für Haupt- und Zusatzlimits, auch ohne Fenster. `reached` bleibt dreistufig: `true`, `false`, `null`. Prozentbalken benötigen weiterhin echte Prozentdaten. Synthetische zusätzliche Hauptfenster werden nicht als zweites unabhängiges Limit gezählt.

Die Karte meldet „Mindestens ein Limit erreicht“ und benennt die betroffene Funktion. Ein gesperrtes Zusatzfeature färbt gesunde andere Fenster nicht automatisch als gesperrt. Der bisherige allgemeine Binärsensor behält seine Bedeutung. Freitextnamen werden weiterhin als Text gerendert. Ein alter Kartenclient zeigt die Zusatzinformation erst nach Laden des neuen Bundles; Cache-/Versionshinweis gehört zur Release-Prüfung.

### F3: Getrennte Quellenfrische

Additives `sources`-Objekt für `usage`, `profile`, `reset_details`, jeweils mit `updated_at` und `state`: `ok`, `error`, `unsupported`, `never`. Keine intern gespeicherten Fehlertexte übertragen. Backend-Zeitpunkte sind Zeitpunkt des erfolgreichen Abrufs, kein Nachweis des Erzeugungszeitpunkts beim Anbieter.

Für optionale Quellen kennzeichnet die Karte Daten nach 7.200 Sekunden als veraltet. Fehler/fehlende Unterstützung werden sofort angezeigt, unabhängig vom Alter. Zwischengespeicherte Profilwerte bleiben lesbar, mit Alter und Zustand. Eine aktuelle Usage-Anzahl bleibt aktuell, auch wenn ergänzende Reset-Details alt sind. Ein Profilfehler macht die Usage-Sensoren nicht unverfügbar.

Die Karte aktualisiert zeitabhängige Anzeigen lokal einmal pro Minute, ohne zusätzliche WS-/HTTP-Abfrage. Timer beim Entfernen der Karte aufräumen. Bisherige Einstellung `stale_after_minutes` bleibt für Usage gültig.

### F4: Kleine Sensorergänzung

Vier neue optionale Sensoren: `next_known_reset_credit_expiry`, `usage_last_success`, `profile_last_success`, `reset_details_last_success`. Timestamp-Device-Class, keine `state_class`. Die drei letzten sind Diagnose-Entities. Der bestehende Sensor `available_reset_credits` übernimmt das gemeinsame Ergebnis und behält seine Unique-ID. Bekannte letzte Abrufzeitpunkte sollen auch während eines API-Ausfalls als Diagnose sichtbar bleiben; daraus darf kein gesunder Usage-Zustand abgeleitet werden.

### A1: Eine belastbare Warnvorlage

Erster Blueprint ausschließlich für einen ausgewählten Prozent-Nutzungssensor. Standard: Warnung ab 80 %, Rücksetzen bei höchstens 75 %. Ein eigener `input_boolean` speichert, ob für diese kritische Phase bereits gewarnt wurde. Auslösen durch Zustandsänderung, HA-Start und einen Fünf-Minuten-Takt; `unknown`/`unavailable` erzeugen keine Warnung und löschen keinen gespeicherten Warnzustand. Nutzer wählt die Aktion; die Integration versendet nichts selbstständig.

Wiederhergestellter Helper verhindert erneute Warnung bei Neustart. Zustand erst nach erfolgreicher Aktion auf „gewarnt“ setzen, `mode: single`; fehlgeschlagene Aktionen können beim nächsten Takt erneut versucht werden. Eine Wiederholungswarnung in unverändert kritischem Zustand ist nicht Teil von A1. Für jede Blueprint-Instanz ist ein eigener Helper erforderlich.

Ein Blueprint im Repository wird nicht allein durch die HACS-Installation einer Integration nutzbar. Deshalb einen eigenen GitHub-Importpfad und eine Anleitung anbieten; Import und spätere Aktualisierung bleiben bewusst getrennt. [HACS-Installationsumfang](https://hacs.xyz/docs/use/repositories/type/integration/), [Blueprint-Import](https://www.home-assistant.io/docs/automation/using_blueprints/).

## 4. Architekturentscheidung und spätere Erweiterungen

| Variante                                            | Vorteil                                               | Zusatzlast / Grenze                                                                     | Entscheidung                                      |
| --------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Bestehenden HTTP-Monitor verbessern                 | Bestehender Login, keine neue Runtime, direkt testbar | WHAM-Vertrag bleibt undokumentiert                                                      | Für F/R/V empfohlen                               |
| Codex-CLI direkt im HA-Prozess starten              | Ein gemeinsamer Produktprozess auf den ersten Blick   | Binärverteilung, Plattformen, Auth-Speicher und Prozess-Lebenszyklus koppeln sich an HA | Nicht als Standard vorsehen                       |
| Separater Adapter mit lokalem App-Server über stdio | Versions-/Loginfehler vom HA-Monitor isolierbar       | Zweiter Dienst, eigenständiger Login, gesicherte Transportstrecke nötig                 | Nur nach D1, zuerst ein unterstützter Betriebsweg |
| Enterprise-/Platform-API                            | Dokumentierte Datenquelle für eigenen Anwendungsfall  | Andere Berechtigungen und andere Metriken                                               | Separates Modul bei bestätigtem Bedarf            |

Für einen Adapter wäre `stdio` die erste Wahl; der dokumentierte WebSocket-Transport ist experimentell und nicht für Produktion unterstützt. Die Brücke würde ausschließlich normalisierte Monitoringdaten bereitstellen und keine offenen RPC-Aufrufe aus HA durchreichen. [App Server](https://learn.chatgpt.com/docs/app-server).

**D1 muss mit einem Ergebnis enden, nicht mit einer halbfertigen Produktanbindung:**

1. Innerhalb von 1–2 h einen verfügbaren Build identifizieren, dessen Schema die gewünschte Methode wirklich beschreibt. Keine Versionsnummer vermuten. Wenn keiner verfügbar ist: beenden und Ursache dokumentieren.
2. Innerhalb von 1–2 h einen separaten Testlogin und die Zuordnung des ausgewählten Accounts prüfen; keine bestehenden HA-OAuth-Tokens in fremde Prozesse kopieren.
3. Innerhalb von 1–2 h Antwortform, `null` gegenüber leerer Liste, Datums-/Zeitzonenvertrag und erwartete Aktualisierung prüfen. Kontrollierte Testdaten nur als solche benennen; keine zusätzlichen Modellaufrufe zur Datenerzeugung ohne Auftrag.
4. Innerhalb von 1–2 h Verhalten bei Neustart, Ablauf des Logins, fehlender Methode und Adapterausfall prüfen. Der existierende HA-Monitor muss unabhängig weiterarbeiten.

**Go für D2** nur bei reproduzierbarer lesender Abfrage, überprüfter Kontozuordnung, dokumentierter Zeitsemantik und unterstützbarem Betriebsweg. Ein fehlender Tageswert darf nicht als Nullverbrauch erscheinen. Bereits erfasste Tage müssen bei Nachlieferungen ersetzbar sein, ohne doppelte Summierung. Nicht finanzieren, solange lediglich die öffentliche Methodendokumentation vorliegt.

**V1:** Für schwankende Salden und Grenzwerte ist eine Messwertstatistik naheliegend. `spend_used` zunächst ebenfalls als gemeldeter Stand behandeln; eine Verbrauchssumme benötigt einen nachgewiesenen Reset-/Korrekturvertrag. Keine USD-/EUR-Device-Class für Credit-Einheiten. HA verlangt geeignete Zustandsklassen für Langzeitstatistiken; Bestandsdaten werden durch Ergänzung nicht automatisch vollständig historisch rekonstruiert. [Sensorstatistik](https://developers.home-assistant.io/docs/core/entity/sensor/).

**V2:** `Rest-Prozentpunkte / verbleibende Stunden` berechnen, nur für gültige zukünftige Resets. Beschriftung „Budget bis Reset“, keine Prognose über zukünftige Nachfrage. Bei fehlender Dauer/Reset, negativer Zeit oder unbekanntem Rest kein Wert.

**V3:** Zuerst vorhandene HA-Verlaufsansichten dokumentieren. Eigene Karte nur bauen, wenn ein eingebetteter Verlauf nachgefragt wird. Maximal ausgewählte Entities und begrenzten Zeitraum laden; Berechtigungen prüfen; Fensterwechsel, unbekannte Werte und Lücken nicht zu einer scheinbar durchgehenden Verbrauchslinie verbinden.

**V4:** Accounts nebeneinander vergleichen; keine Prozentsummen bilden und eventuell gemeinsame Workspace-Credits nicht addieren. Bestehende Modi und Einstellungen erhalten.

**R1:** Neue Optionswerte standardmäßig `true`; Ausschalten beendet zukünftige optionale Abfragen und leert die betreffende optionale Darstellung. Usage-Anzahl für Resets bleibt unabhängig davon nutzbar. Wiederanschalten erzwingt beim nächsten Refresh einen Detailversuch.

**R2:** Delta-Sekunden und HTTP-Datum aus `Retry-After` normalisieren, ungültige Werte auf bisherigen Backoff zurückführen. Core-Drosselung an `UpdateFailed(retry_after=...)` weitergeben, optionale Drosselung nur im jeweiligen optionalen Abrufplan berücksichtigen. Keine zusätzlichen Retries in derselben Schleife. Ein lokales Maximum darf nicht zu einem erneuten Request vor der serverseitig geforderten Wartezeit führen. Vor Umsetzung HA 2026.3.0 gezielt prüfen.

## 5. Umsetzung, Abnahme und Nutzenmessung

| Meilenstein | Lieferumfang / Ende                                      | Geschätzter Aufwand | Freigabekriterium                                                                          |
| ----------- | -------------------------------------------------------- | ------------------: | ------------------------------------------------------------------------------------------ |
| M1          | F1 und F2: gemeinsame Zähler, vollständige Statusanzeige |              8–12 h | Die beiden reproduzierten Widersprüche sind durch Regressionstests ausgeschlossen          |
| M2          | F3 und F4: Quellenalter und Timestamp-Sensoren           |              8–13 h | Alte optionale Daten bleiben unterscheidbar; bestehende IDs bleiben gleich                 |
| M3          | F5: kompatibles, geprüftes Paket                         |               4–7 h | HA-Mindestversion/aktuelle CI-Version, Frontend- und Bundle-Prüfung, Linux-Smoke-Test grün |
| M4          | A1: importierbare Warnvorlage                            |              6–10 h | Einmalige Warnung, Hysterese, Neustart, unbekannte Daten und Aktionsfehler geprüft         |

M1 → M2 → M3 bildet eine eigenständig veröffentlichbare Verbesserung. M4 kann unabhängig umgesetzt und anschließend dokumentiert werden; der Blueprint benötigt bereits vorhandene Prozent-Sensoren. Eine Release-Veröffentlichung ist kein Bestandteil dieser Untersuchung.

Konkrete technische Pläne:

- [F1–F5: Monitoring-Zuverlässigkeit](../superpowers/plans/2026-09-04-monitoring-reliability.md)
- [A1: Warn-Blueprint](../superpowers/plans/2026-09-04-usage-alerts.md)

**Abnahmefälle:** Usage-Anzahl 4/Details 1; bekannte 0/alte positive Details; fehlende Anzahl; abgelaufene oder unbekannte Reset-Statuswerte; fensterloses gesperrtes Zusatzlimit; unbekannter Sperrstatus; Profilfehler bei funktionierendem Usage; sieben Tage alte Details; Uhrzeitwechsel ohne neuen Snapshot; eingeschränkter HA-Nutzer; mehrere Config Entries; Neustart und Bundle-Cache.

**Nutzen nach Einführung bewerten:** keine widersprüchlichen Reset-Anzahlen im selben Snapshot; jede explizite Zusatzlimitsperre mit Funktionsname sichtbar; jede optionale Anzeige hat nachvollziehbares Alter; maximal eine Warnung je kritischer Phase; keine höhere Zahl regulärer Backendabfragen durch F1–F4. Ohne Telemetrie über persönliche Nutzungsdaten prüfen: lokale Tests, Testinstallation und freiwillige Rückmeldungen reichen.

Laufende Wartung bleibt beim ersten Paket nahe dem heutigen Betriebsmodell. Zusätzliche Verträge liegen vor allem im internen Kartenschema und Blueprint. D2 würde dagegen CLI-Version, Protokoll, Adapterdienst und zweiten Login als weitere Fehlerquellen hinzufügen. Das ist der Hauptgrund für die gestufte Empfehlung.

## 6. Grenzen und offene Nachweise

Die Untersuchung verbindet Codeprüfung, offizielle Dokumentation, lokale synthetische Datenproben und kontofreie CLI-Schemaerzeugung. In der vorherigen Astra-Prüfung bestanden 107 ausgewählte Backend- und 56 Frontend-Tests; diese sind keine Tests der hier erst vorgeschlagenen Änderungen. Für diesen Plan wurden keine Änderungen implementiert und kein produktiver HA-/App-Server-/Enterprise-Test ausgeführt.

Die drei neuen Dokumente wurden auf lokale Verweise und geschlossene Codeblöcke geprüft; acht Python-Beispiele sind syntaktisch gültig. Der YAML-Entwurf in A1 besteht die Blueprint-, Script- und Bedingungsschemata der lokal installierten HA-Version 2026.8.3 in einem isolierten, nicht gestarteten HA-Objekt. Das belegt die statische Form, nicht das geplante Laufzeitverhalten oder die Mindestversionskompatibilität.

Unbekannt bleiben tatsächliche Häufigkeit der Fehlerfälle, Zugang zu Tagesdaten mit einem geeigneten Build, Vollständigkeit der Reset-Detailzeilen, die serverseitige Verzögerung optionaler Statistiken und das Nutzungsinteresse an eigenen Diagrammen. Diese Unsicherheiten verhindern F1–F5 und A1 nicht. Sie begrenzen die Zusagen für Ablaufwarnungen, Tagesverbrauch und finanzielle Auswertungen.
