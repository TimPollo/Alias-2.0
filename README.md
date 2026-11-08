# AliasDock 2.0

**Ein privater, selbst gehosteter E-Mail-Alias-Manager mit echtem SMTP-Empfang und Web-Posteingang.**

> **Bitte zuerst lesen:** [START_HERE.md](START_HERE.md) erklärt die Installation in wenigen Schritten. GitHub kann dieses Projekt speichern und testen, aber **nicht** selbst als Mailserver betreiben. Die bloße Generierung einer Adresse bedeutet **nicht**, dass E-Mails aus dem Internet ankommen.

AliasDock ist für persönliche E-Mail-Aliasse, Testpostfächer, Datenschutz und autorisierte Softwaretests gedacht. Die Anwendung erstellt **keine Konten auf Drittplattformen**, automatisiert keine Registrierungen und umgeht keine Spam- oder Bot-Schutzsysteme.

## Funktionen

- Persönliche Adressen unter **deiner eigenen Domain** anlegen, deaktivieren und löschen
- Eingehende E-Mails über einen SMTP-Empfänger annehmen, **nur** für zuvor angelegte aktive Adressen
- HTML-only-Nachrichten als sicheren Text inklusive vorhandener HTTP(S)-Bestätigungslinks anzeigen
- Posteingang mit Suche, Einzelansicht, Lesestatus und automatischer Aktualisierung
- Responsive Oberfläche und Admin-Login mit geschütztem Session-Cookie und CSRF-Prüfung
- Automatische Nachrichtenlöschung, begrenzte Adresszahl und Speicherlimits
- **Lokaler Demomodus** mit echter SMTP-Testzustellung per Klick, ohne öffentliche Domain
- Automatische API-, MIME- und SMTP-Tests plus Docker-Smoke-Test in GitHub Actions
- Docker-Compose für Demo und optionalen eigenen öffentlichen Server

**Was die App nicht kann:** E-Mail-Domains kostenlos registrieren, einen Server über GitHub Pages hosten, ohne DNS/Server öffentliche E-Mails empfangen, SMTP-Mails versenden oder garantieren, dass Drittplattformen die Adressen akzeptieren. Kein SMTP-Relay und kein öffentliches Wegwerf-Mail-Portal.

## A. Lokal testen – keine Domain erforderlich

Voraussetzungen: **Docker Desktop** oder Docker Engine mit Compose und **Python 3** für die Erstkonfiguration.

```bash
cd aliasdock
python scripts/setup.py --local
docker compose -f compose.local.yaml up -d --build
```

Auf Windows wird Python gegebenenfalls mit `py` statt `python` aufgerufen. **http://127.0.0.1:8000** öffnen, mit `admin` und dem bei der Einrichtung angezeigten Passwort anmelden.

1. Auf **Neue Adresse** klicken. Es entsteht etwa `privat-abcdef1234@aliasdock.test`.
2. Auf **Test-E-Mail senden** klicken. Der lokale SMTP-Server nimmt eine Nachricht an und speichert sie im Posteingang.
3. Bei Bedarf auf **Aktualisieren** klicken und die Nachricht öffnen.
4. Optional alles per automatischem Smoke-Test prüfen:

```bash
python scripts/smoke_local.py
```

Der Smoke-Test erstellt einen Alias, lässt ihn via SMTP anschreiben, prüft den Posteingang per HTTP und löscht anschließend seinen Test-Alias.

Alternativ direkt SMTP testen:

```bash
python scripts/send_test_mail.py privat-abcdef1234@aliasdock.test
```

Die Testadresse muss vorher angelegt worden sein. **`.test` ist eine reservierte Test-Domain, nicht öffentlich zustellbar.**

Logs und Anhalten:

```bash
docker compose -f compose.local.yaml logs --tail=100 app
docker compose -f compose.local.yaml down
```

`down` ohne `-v` erhält die Daten im Docker-Volume. `down -v` löscht das Volume inklusive Posteingang.

## B. Auf GitHub stellen

Leeres Repository erstellen und alle Projektdateien hochladen – einschließlich `.github/workflows/test.yml`. Die erzeugte Datei `.env` ist durch `.gitignore` ausgeschlossen und gehört **nie** in ein Repository.

GitHub Actions hat zwei Jobs:

- Python-Tests, inkl. Tests mit einem echten, lokal gestarteten SMTP-Listener (aiosmtpd)
- Docker-Build, Start der Demo und echter HTTP-/SMTP-Smoke-Test

**Achtung:** Ein grüner GitHub-Workflow bedeutet, dass der Code getestet ist – **nicht**, dass du eine öffentlich erreichbare E-Mail-Adresse besitzt oder GitHub einen Mailserver für dich ausführt.

## C. Echte E-Mails aus dem Internet empfangen

Dafür brauchst du gleichzeitig:

1. **Eine eigene registrierte Domain**, z. B. `meinedomain.de`, für die du DNS-Einträge ändern kannst.
2. **Einen öffentlich erreichbaren Server** mit IPv4 und eingehendem TCP-Port **25**. Viele Cloud-Free-Tiers und Heimanschlüsse blockieren diesen Port. Prüfe das vor der Einrichtung.
3. **MX- und A-DNS-Einträge** für diese Domain. Beispiel:

| Typ | Host | Wert |
| --- | --- | --- |
| `A` | `mail.meinedomain.de` | `DEINE_PUBLIC_SERVER_IPV4` |
| `A` | `inbox.meinedomain.de` | `DEINE_PUBLIC_SERVER_IPV4` |
| `MX` | `meinedomain.de` | `10 mail.meinedomain.de` |

4. Einrichtung auf dem **eigenen Server**:

```bash
python scripts/setup.py --domain meinedomain.de --host inbox.meinedomain.de
docker compose -f compose.prod.yaml up -d --build
```

Öffne anschließend das Dashboard unter **https://inbox.meinedomain.de**. Der Webserver Caddy kümmert sich um HTTPS für die Weboberfläche, sofern die Domain korrekt auf den Server zeigt und Zertifikate ausgestellt werden können.

**SMTP-Verschlüsselung:** Das Basissetup hat **kein automatisch konfiguriertes SMTP-STARTTLS**. HTTPS der Weboberfläche schützt nicht die Zustellung auf Port 25. Einige Absender können unverschlüsselt zustellen, andere die Zustellung ablehnen. Richte vor ernsthafter Nutzung zusätzlich einen ordentlich konfigurierten SMTP-Frontend-Server mit TLS und gültigem Zertifikat ein oder verwende die optionale TLS-Konfiguration unten. Für sensible Nachrichten ist ein etablierter E-Mail-Anbieter vorzuziehen. Siehe [SECURITY.md](SECURITY.md).

Optional kann aiosmtpd mit eigenen Zertifikatsdateien STARTTLS anbieten: Zertifikat und Schlüssel sicher in den Container einbinden und `SMTP_TLS_CERT` sowie `SMTP_TLS_KEY` setzen. Die Dateien müssen für den nicht privilegierten App-Prozess lesbar sein. STARTTLS ist opportunistisch und erzwingt keine Ende-zu-Ende-Verschlüsselung.

### Öffentlichen Empfang testen

- DNS prüfen: `dig MX meinedomain.de` (oder `nslookup -type=mx meinedomain.de`). Der MX-Eintrag muss deinen Mailserver benennen.
- Prüfen, ob die Port-25-Firewall-Regel eingehend geöffnet und der SMTP-Dienst von einem **externen** Netz erreichbar ist.
- Im Dashboard einen aktiven Alias erstellen und **von einem normalen externen E-Mail-Konto** eine E-Mail an diesen Alias senden.
- Nachricht im Dashboard suchen; im Fehlerfall die SMTP-Logs des Servers und Fehler-Rückmeldungen der absendenden Mail prüfen.
- Der Status „SMTP-Server gestartet“ in der App sagt **nur**, dass er lokal lauscht, **nicht**, dass Domain oder externe Zustellung funktionieren.

Das App-Backend hat standardmäßig **keine ausgehenden E-Mails**. SPF, DKIM und DMARC sind in erster Linie für ausgehende E-Mail wichtig; die Domainkonfiguration sollte dennoch sorgfältig erfolgen.

## Einstellungen und Datenhaltung

Die private `.env` wird von `scripts/setup.py` erstellt. In Docker-Compose wird sie als `env_file` geladen.

| Einstellung | Standard | Bedeutung |
| --- | --- | --- |
| `APP_MODE` | `production` | `demo` für lokalen SMTP-Test; in öffentlicher Compose-Datei wird `production` erzwungen |
| `ALIAS_DOMAIN` | erforderlich | Domain, die du kontrollierst; Demo `aliasdock.test` |
| `PUBLIC_HOST` | erforderlich in Produktion | Hostname der Weboberfläche |
| `ADMIN_USERNAME` | `admin` | Administrator |
| `ADMIN_PASSWORD` | vom Setup zufällig erzeugt | mindestens 16 Zeichen |
| `APP_SECRET` | vom Setup zufällig erzeugt | mindestens 32 Zeichen |
| `DATABASE_PATH` | `/data/aliasdock.sqlite3` | SQLite-Datei |
| `MAX_ALIASES` | `25` | Limit aktiver und inaktiver Adressen zusammen |
| `MAX_MESSAGE_BYTES` | `5242880` | SMTP-Größenlimit: 5 MiB |
| `RETENTION_DAYS` | `14` | Nachrichten nach Zeitablauf entfernen |
| `MAX_STORED_MESSAGES` | `2000` | Gesamtlimit gespeicherter Nachrichten |
| `SMTP_PORT` | `2525` | Port im Container, öffentlich auf 25 weitergeleitet |
| `ENABLE_SMTP` | `true` | SMTP-Listener aktivieren |
| `SMTP_TLS_CERT` / `SMTP_TLS_KEY` | leer | Optional, vorhandene Zertifikatsdateien im Container |

Zusätzlich: höchstens 10 neue Alias-Adressen je Stunde, höchstens 10 Empfänger pro SMTP-Nachricht. Nachrichten bleiben als begrenzter Klartext in SQLite; HTML, Anhänge, eingebettete Bilder und JavaScript werden nicht dargestellt. HTML-only-Ankerlinks werden als **Text** sichtbar gemacht, nicht automatisch aufgerufen. Die App wird mit nur einem Worker betrieben (SMTP-Listener und SQLite teilen sich den Prozess).

### Backups

```bash
docker compose -f compose.prod.yaml exec -T app python -c "import sqlite3; a=sqlite3.connect('/data/aliasdock.sqlite3'); b=sqlite3.connect('/data/aliasdock-backup.sqlite3'); a.backup(b); b.close(); a.close()"
```

Danach eine Kopie **außerhalb** des Docker-Volumes sicher aufbewahren. Das Backup enthält möglicherweise vertrauliche Nachrichten. Updates:

```bash
docker compose -f compose.prod.yaml up -d --build
```

### Bestehende Installation von Version 1

- **Keine alte `.env` versehentlich überschreiben**. Sichere erst Datenbank und `.env`.
- Die alte Demo verwendete `example.org`; die neue Demo benutzt die ausdrücklich nicht öffentlich gültige Domain `aliasdock.test`. Bei bestehender `.env` bleibt die alte Domain erhalten, bis du sie selbst änderst.
- Ändert sich `ALIAS_DOMAIN`, werden die gespeicherten lokalen Teile deiner Aliasse mit der neuen Domain angezeigt. Prüfe deshalb die Konfiguration vor dem öffentlichen Einsatz.
- Nutzerdaten befinden sich im Docker-Volume und werden durch `docker compose down` **ohne `-v`** nicht gelöscht.

## Entwicklung und Tests

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
node --check static/app.js
```

Für den SMTP-Integrationstest muss `aiosmtpd` installiert sein. Wenn das Modul fehlt, wird **genau dieser Integrationstest übersprungen**; in GitHub Actions wird er durch das vollständige Requirements-Setup installiert und ausgeführt.

Die App wurde nicht unabhängig sicherheitsgeprüft. Sie ist für **einen** Administrator ausgelegt, nicht als Multi-User-Maildienst, und stellt keine Garantie für die Zustellung oder Annahme durch Drittplattformen dar.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
