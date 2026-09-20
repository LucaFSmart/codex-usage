# GPT-6 Astra: Dokumentation und Auswirkungen auf Codex Usage

Stand: 4. September 2026. Geprüfter Projektstand: `ba63247`, Integration 0.6.5.

> **Korrektur vom 5. September 2026:** Die Authentifizierung der Enterprise Analytics API ist in den offiziellen Quellen widersprüchlich beschrieben. Die frühere Aussage zu einem Platform-Organisationsschlüssel ist daher nicht als gesicherte Vorgabe zu verwenden. Maßgeblich ist der [nachgelagerte Dokumentationsabgleich](2026-09-05-openai-documentation-recheck.md#8-enterprise-analytics-authentication-official-sources-conflict). Alle Quellcodeverweise dieses historischen Berichts zeigen unveränderlich auf den geprüften Commit `ba63247`.

Die öffentliche Astra-Dokumentation ist verfügbar. Aus dem Abgleich ergibt sich derzeit kein belegter, durch Astra zwingend erforderlicher Umbau dieser Home-Assistant-Integration. Die Aussage ist eine Dokumentations- und Codeprüfung mit lokalen Tests, keine Bestätigung eines produktiven Astra-Kontos.

Der API-Changelog datiert die Vorstellung und die neuen Steuerungsfunktionen auf den **3. September 2026**. Die Modellseite beschreibt einen gestaffelten Zugang: zunächst Enterprise im Trusted Access Program, weitere API- und ChatGPT-Zugänge in den folgenden Tagen. Öffentlich dokumentiert bedeutet daher noch nicht für jedes Konto freigeschaltet. [API-Changelog](https://developers.openai.com/api/docs/changelog), [Astra-Modellseite](https://developers.openai.com/api/docs/models/gpt-6-astra).

**Was öffentlich dokumentiert ist**

| Thema        | Verifizierter Stand                                                                                      | Bedeutung für dieses Projekt                                          |
| ------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Modell       | `gpt-6-astra`; 1.050.000 Kontexttokens, maximal 128.000 Ausgabetokens                                    | Keine Modellliste in der Integration erforderlich                     |
| Modellzugang | Responses, Chat Completions und Batch; Tool Calling benötigt Responses                                   | Das Projekt erzeugt keine Modellantworten                             |
| Reasoning    | `low`, `medium`, `high`, `xhigh`, `max`; kein `none`                                                     | Profilstatistiken übernehmen Reasoning-Bezeichnungen bereits als Text |
| Migration    | `temperature`, `top_p` und Logprob-Parameter entfernen; bei älteren Integrationen Cache-Parameter prüfen | Diese Request-Parameter existieren hier nicht                         |

Die Endpunktunterstützung wurde mit dem Modellvergleich und dem Migrationsleitfaden abgeglichen. Die allgemeine Endpunktliste auf Modellseiten allein ist keine hinreichende Aussage zur Unterstützung jeder dort aufgeführten API. [Modellvergleich](https://developers.openai.com/api/docs/models/compare), [Astra-Migrationsleitfaden](https://developers.openai.com/api/docs/guides/latest-model).

**Neue Funktionen und konkrete Schnittstellen**

| Schnittstelle / Feld                                             | Funktion                                                                                                                     | Einordnung                                                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `POST /v1/responses`, Tooldefinition mit `async: true`           | Tools laufen weiter, während das Modell andere Arbeit erledigt; Resultate werden über die ursprüngliche `call_id` zugeordnet | Erweiterung der bestehenden Responses API, kein neuer Usage-Endpunkt                             |
| Responses-WebSocket: `response.steer`, `response.steer.accepted` | Zusätzliche Nutzeranweisungen während laufender Arbeit                                                                       | Neue Ereignisse; für diesen Polling-Monitor nicht erforderlich                                   |
| Input-Item `configuration_update`                                | Reasoning-Aufwand zwischen Antworten ändern und den Cache-Präfix erhalten                                                    | Kein Ersatz für unsere Usage-Abfrage                                                             |
| `GET /v1/safety/alerts/{id}`                                     | Sicherheitsmeldung eines API-Projekts abrufen                                                                                | Konkreter dokumentierter HTTP-Endpunkt; eigener Projektzugang mit `api.safety.alerts.read` nötig |
| Webhook `safety.alert.created`                                   | Meldung über eine Sicherheitsauffälligkeit                                                                                   | Kein Kontingent- oder Verbrauchsereignis                                                         |

Async Tool Calling führt Anwendungstools weiterhin in der eigenen Anwendung aus. [Async Tool Calling](https://developers.openai.com/api/docs/guides/async-tool-calling).

Steering kann die alte Antwort mit `response.incomplete` und Grund `steered` beenden; die Fortsetzung erhält einen eigenen Antwortverlauf. Bereits gestartete Tools werden dadurch nicht rückgängig gemacht. [Mid-turn Steering](https://developers.openai.com/api/docs/guides/steering).

`configuration_update` ist für Astra im Standardmodus mit einem Agenten dokumentiert. Automatische Compaction/Truncation und der separate `/responses/compact`-Aufruf haben Einschränkungen. Das Feld `response.reasoning.effort` bleibt die Request-Einstellung und ist nicht zwangsläufig der zuletzt dynamisch gewählte Aufwand. [Reasoning-Dokumentation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation).

Safety-Monitoring kann `403` mit `misalignment_policy_violation` liefern. Das ist von einer abgelaufenen Anmeldung zu unterscheiden, wenn künftig eine Modell-API angebunden wird. Für unsere WHAM-GETs ist keine entsprechende Vertragsänderung belegt; deshalb wäre eine pauschale Änderung ihrer 403-Behandlung spekulativ. [Monitoring](https://developers.openai.com/api/docs/guides/safety-checks/misalignment-monitoring), [Safety-Alert-Referenz](https://developers.openai.com/api/reference/resources/safety/subresources/alerts/methods/retrieve).

**Verbrauch und Abrechnung**

Die Astra-Modellseite nennt pro Million Tokens 10 USD Input, 1 USD gecachten Input, 12,50 USD Cache Writes und 50 USD Output. Über 272.000 Eingabetokens gelten Aufschläge auf den gesamten Request. API Fast kostet laut Modellseite das Zweifache der anwendbaren Raten. [Astra-Modellseite](https://developers.openai.com/api/docs/models/gpt-6-astra).

Die englische ChatGPT-/Codex-Preisseite nennt für Astra 250 Credits Input, 25 Credits gecachten Input und 1.250 Credits Output je Million Tokens; Fast hat dort den Faktor 2,5. ChatGPT Work und Codex teilen sich die Nutzung. Diese Produktgrenzen dürfen bei einer späteren Kostenfunktion nicht vermischt werden. [ChatGPT-/Codex-Preise](https://learn.chatgpt.com/docs/pricing).

Unsere Integration berechnet keine Modellkosten. Sie übernimmt `used_percent`, `credits.balance` und `spend_control.individual_limit` vom Backend. Deshalb ist weder eine Astra-Preistabelle noch eine lokale Multiplikation der gemeldeten Prozente oder Credits erforderlich. Ein höherer Verbrauch erscheint über die nächsten gelieferten Backendwerte.

**Abgleich mit dem vorhandenen Code**

| Bereich                 | Fundstelle                                                                                                                                                     | Ergebnis                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Endpunkte               | [const.py](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/const.py#L20)                 | Vier WHAM-GETs für Usage, Profil, Accounts und Reset-Credits; keine Modellaufrufe           |
| Zusätzliche Kontingente | [api.py](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/api.py#L469)                    | `additional_rate_limits` wird dynamisch über `metered_feature` und `limit_name` verarbeitet |
| Unbekannte Dauer        | [api.py](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/api.py#L93)                     | Dauerabhängige Benennung; tägliche und 30-tägige Fenster benötigen keinen Astra-Sonderfall  |
| Neue Sensoren           | [sensor.py](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/sensor.py#L330)              | Zusätzliche gemeldete Fenster erzeugen Sensoren für Nutzung, Rest und Reset                 |
| Dashboard               | [card_data.py](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/card_data.py#L54)         | Normalisierte Zusatzlimits werden zur Karte durchgereicht                                   |
| Credits/Spend           | [api.py](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/api.py#L513)                    | Bereits enthalten; keine fest codierten Tokenpreise                                         |
| Profil                  | [api.py](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/api.py#L652)                    | Aggregierte Tokenstatistiken vorhanden; keine Tagesreihe oder Modellaufteilung              |
| Sperrstatus             | [binary_sensor.py](https://github.com/LucaFSmart/codex-usage/blob/ba6324715bc7947875aeb0cf670b8dea6abfd520/custom_components/codex_usage/binary_sensor.py#L27) | Ein erreichtes Zusatzlimit setzt den allgemeinen Limit-Sensor                               |

Kompatibilität gilt innerhalb des heute implementierten Datenformats: höchstens 50 zusätzliche Einträge, jeweils `primary_window` und `secondary_window`. Beliebige neue JSON-Strukturen, weitere Fensterfelder oder separate Antwortformate werden dadurch nicht automatisch unterstützt.

Falls Astra ein eigenes Kontingent im bestehenden `additional_rate_limits`-Format erhält, kann es ohne fest codierte Modellkennung erscheinen. Dass OpenAI tatsächlich ein solches Astra-Kontingent liefert, ist in dieser Prüfung **nicht nachgewiesen**.

**Öffentliche Alternativen und Erweiterungsmöglichkeiten**

Der Codex App Server dokumentiert `account/rateLimits/read`, die Benachrichtigung `account/rateLimits/updated` und `rateLimitsByLimitId` für mehrere Kontingente. `account/usage/read` liefert Zusammenfassungen sowie optional `dailyUsageBuckets` mit `startDate` und `tokens`. Das sind App-Server-Methoden, keine austauschbaren WHAM-HTTP-Routen. Ihr Vorhandensein ist bestätigt; eine Einführung erst mit Astra ist nicht belegt. [Codex App Server](https://learn.chatgpt.com/docs/app-server).

Eine Tageshistorie wäre eine konkrete funktionale Erweiterung. Dafür müssten Transport, optionale Abfragen, Datenmodell und Darstellung ergänzt werden. Für einen App-Server-Adapter wäre außerdem eine betreibbare Codex-Komponente erforderlich. Aus der RPC-Dokumentation lässt sich kein neuer direkter WHAM-Pfad ableiten.

Die Codex Analytics API liefert aggregierte Workspace-Metriken. Die offiziellen Quellen widersprechen sich jedoch bei der erforderlichen Anmeldeart; sie muss vor einer gesonderten Workspace-Reporting-Anbindung anhand einer verifizierten Referenz und eines berechtigten Testzugangs geklärt werden. [Dokumentationsabgleich vom 5. September 2026](2026-09-05-openai-documentation-recheck.md#8-enterprise-analytics-authentication-official-sources-conflict).

Die Platform bietet außerdem `GET /v1/organization/usage/completions` und `GET /v1/organization/costs`. Diese adressieren API-Nutzung; sie ersetzen nicht die abonnementsbezogenen Codex-Limitfenster dieses Projekts. [Platform Usage API](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage).

Device-Code-Anmeldung ist weiterhin öffentlich beschrieben. Eine durch Astra vorgeschriebene OAuth-Umstellung habe ich nicht gefunden. [Authentifizierung](https://learn.chatgpt.com/docs/auth#preferred-device-code-authentication-beta).

**Konkreter Handlungsbedarf**

1. **Aktuell kein belegter Pflichtpatch:** Endpunktkonstanten, Modelllisten und Credit-Berechnung benötigen anhand der gefundenen Quellen keine Astra-Änderung.
2. **Vor einer Zusage „Astra live verifiziert“:** Eine anonymisierte Usage-Antwort eines freigeschalteten Kontos mit Haupt-/Zusatzlimits und Sperrstatus gegen Parser und Karte prüfen. Erst daraus ergibt sich ein möglicher Schema-Patch.
3. **Sinnvolle Produkterweiterung:** Tägliche Tokenstatistiken untersuchen; die aktuelle Integration speichert nur Profilaggregate. Kein Astra-Kompatibilitätsblocker.
4. **Bei separaten Modelllimits:** Prüfen, ob der allgemeine Sperrstatus die gewünschte Bedeutung behält. Heute bedeutet ein gesperrtes Zusatzlimit „mindestens ein Limit erreicht“. Es beweist nicht, dass jedes Modell gesperrt ist. Das ist bestehende Produktsemantik, kein nachgewiesener neuer Astra-Fehler.
5. **Bei einer späteren Modell-API-Anbindung:** Async-/Steering-Ereignisse, Safety-Fehler, Reasoning- und Cache-Parameter gesondert umsetzen. Eine solche Anbindung gehört derzeit nicht zum Funktionsumfang.

**Verifikation und Grenzen**

Am 4. September 2026 lokal ausgeführt:

- `.venv/Scripts/python.exe -m pytest tests/test_api.py tests/test_entities.py tests/test_card_data.py tests/test_coordinator.py`: **107 bestanden**, fünf Deprecation-Warnungen aus Abhängigkeiten.
- `npm.cmd test -- --run tests/view-model.test.ts tests/status.test.ts tests/card-data.test.ts tests/format.test.ts` im Frontend: **56 bestanden**.
- Synthetischer In-Memory-Test ohne Netzverkehr: unbekannter Plan, ausdrücklich künstliches `synthetic_astra`-Limit, Astra-Anzeigename, Tages- und 30-Tage-Fenster, Restprozente, unveränderter Credit-Saldo und Zusatzlimit-Sperre: **bestanden**.

Keine authentifizierten Astra- oder WHAM-Liveabfragen, kein produktiver Home-Assistant-Rollout und kein Linux-Integration-Smoke-Test wurden durchgeführt. Die vier direkt genutzten WHAM-Routen sind im Projekt ausdrücklich als nicht stabile Drittanbieter-APIs beschrieben. In den durchsuchten öffentlichen Dokumentationsquellen wurde weder ein neuer Astra-WHAM-Endpunkt noch eine entsprechende Ablösung belegt. Eine nicht öffentliche Backendänderung kann die Prüfung daher nicht ausschließen.

Anwendungscode und Konfiguration wurden nicht geändert. Dieser Bericht ist das neue lokale Artefakt.
