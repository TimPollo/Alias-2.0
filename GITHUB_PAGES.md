# AliasDock auf GitHub Pages anzeigen (v3)

## Die Ursache der weißen Seite in v2

1. Die Startdatei lag unter `static/index.html`, nicht im Repository-Hauptverzeichnis.
2. Die alten `/static/...`-Links waren absolut und zeigten bei Projektseiten auf die falschen URLs.
3. Die eigentliche App war ohne JavaScript anfangs komplett versteckt.
4. GitHub Pages betreibt kein Python-Backend und keinen SMTP-Server.

## Dieses Paket verwenden

1. Alten Repository-Inhalt vollständig durch **den Inhalt** des neuen Ordners `aliasdock_v3` ersetzen (nicht den übergeordneten Ordner selbst hochladen). `.env` und lokale Datenbanken niemals hochladen.
2. Es muss direkt im Repository-Hauptverzeichnis `index.html`, `pages.js`, `.nojekyll`, `static/`, `server/` usw. geben.
3. GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
4. Branch: **main**; Verzeichnis: **/(root)**; **Save**.
5. Die von GitHub angezeigte Pages-URL verwenden. Sie sieht üblicherweise wie `https://BENUTZERNAME.github.io/REPOSITORY/` aus.
6. Cache ggf. aktualisieren, wenn weiterhin eine ältere Version erscheint.

## Was du dort machen kannst

- Eine Beispieladresse `...@aliasdock.test` erzeugen, kopieren, pausieren oder löschen.
- Eine **simulierte** Testnachricht in den lokalen Posteingang legen.
- Posteingang, Suche und Nachrichtendetails ausprobieren.
- Daten nur in deinem aktuellen Browser speichern (Local Storage).

**Wichtig:** Diese GitHub-Pages-Ansicht kann keine realen E-Mails empfangen oder Adressen bei öffentlichen Anbietern anlegen.

## Für echten Empfang

Die Serverversion liegt weiterhin unter `server/`, `static/` und in den Docker-Dateien. Dazu musst du einen externen Laufzeit-Host mit öffentlich erreichbarem SMTP-Empfang, TLS und einer dir gehörenden Domain konfigurieren. Die Startseite unter `static/index.html` ist für diese Servervariante bestimmt, und wird vom FastAPI-Backend bereitgestellt; nicht GitHub Pages.

Für eine erste lokale Server-Demo siehe `START_HERE.md`.
