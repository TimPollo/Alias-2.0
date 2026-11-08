# Weiße GitHub-Seite beheben — AliasDock 3.0

**Die alte Version war nicht korrekt für GitHub Pages vorbereitet.** Entschuldigung dafür.

## Schnellkorrektur für ein bestehendes Repository

1. Das **Fixpaket** entpacken.
2. GitHub-Repository öffnen → **Add file → Upload files**.
3. **Alle entpackten Dateien und den Ordner `static`** direkt in das **Hauptverzeichnis** hochladen. Nicht den äußeren ZIP- oder Projektordner als Unterordner hochladen.
4. Bestehende Dateien `static/app.css` und `static/favicon.svg` bei Bedarf aktualisieren.
5. **Commit changes**.
6. Unter **Settings → Pages**: **Deploy from a branch**, Branch `main`, Ordner **/(root)**, **Save**.
7. Den GitHub-Pages-Link unter „Settings → Pages“ aufrufen.

Im Hauptverzeichnis müssen `index.html`, `pages.js`, `.nojekyll` und `static/` liegen.

## Was danach funktioniert

Die Seite zeigt eine interaktive Demo, in der du Beispieladressen erstellen, Testnachrichten simulieren und Einträge im selben Browser verwalten kannst.

**WICHTIG: Keine echte E-Mail-Zustellung!** `@aliasdock.test`-Adressen sind reine Testadressen. GitHub Pages kann keinen Python-/SMTP-Mailserver ausführen. Hierfür musst du die getrennte Serveranwendung zusätzlich auf einem geeigneten Host betreiben und eine Domain besitzen.

Die vollständige Dokumentation steht in `GITHUB_PAGES.md`.
