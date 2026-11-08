# AliasDock 2.0 – Start in wenigen Schritten

**Zwei Dinge sind wichtig:**

1. **GitHub ist ein Ablageort für Quellcode.** GitHub Pages kann keinen SMTP-Server oder Python-FastAPI-Backend betreiben.
2. **Eine generierte E-Mail-Adresse ist nur dann im Internet erreichbar**, wenn du die zugehörige Domain besitzt und ihr MX-Record zu einem öffentlich erreichbaren SMTP-Server auf Port 25 zeigt.

## Kostenlos ausprobieren (auf dem eigenen Computer)

Voraussetzung: Docker Desktop oder Docker Engine mit `docker compose`, plus Python 3.

1. ZIP entpacken und im Terminal in den Projektordner wechseln.
2. `python scripts/setup.py --local` (Windows: ggf. `py scripts/setup.py --local`). Das Admin-Passwort wird angezeigt und in `.env` gespeichert.
3. `docker compose -f compose.local.yaml up -d --build`
4. `http://127.0.0.1:8000` öffnen, anmelden und auf **Neue Adresse** klicken.
5. Auf **Test-E-Mail senden** klicken. Die Testmail kommt über den lokalen SMTP-Server an.
6. Optional: `python scripts/smoke_local.py` für einen automatischen Ende-zu-Ende-Check.

Die lokal generierten Adressen enden auf `@aliasdock.test`. **Sie funktionieren nur innerhalb dieser Demo.** Niemand im öffentlichen Internet kann sie anschreiben.

Wenn keine E-Mail ankommt, prüfe die Container-Logs:

```bash
docker compose -f compose.local.yaml logs --tail=100 app
```

## Auf GitHub hochladen

Neues Repository erstellen, die entpackten Dateien einschließlich des versteckten Ordners `.github/` hochladen; **`.env` niemals hochladen**. GitHub Actions führt Tests und einen Docker-Smoke-Test aus. Dadurch entsteht aber **kein laufender Maildienst**.

## Echte E-Mails aus dem Internet

Hierfür werden Domain, öffentlicher Server und eingehender Port 25 benötigt. DNS/MX und die vollständige Einrichtung stehen in `README.md`. Die App allein registriert keine Domain und kann keine öffentlich gültigen Adressen kostenlos aus dem Nichts erzeugen. SMTP-STARTTLS ist im Grundsetup nicht automatisch aktiv; Details stehen in `SECURITY.md`.

**Zweck:** Private E-Mail-Aliasse und autorisierte Softwaretests. Keine Garantie auf Akzeptanz bei sozialen Netzwerken oder anderen Drittplattformen.
