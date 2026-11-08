#!/usr/bin/env python3
"""End-to-end smoke test against a running *local demo* using HTTP and SMTP.

Requires no third-party Python modules. Reads .env for local admin credentials.
Run only after `docker compose -f compose.local.yaml up -d --build`.
"""
from __future__ import annotations

import http.cookiejar
import json
import secrets
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener

ROOT = Path(__file__).resolve().parent.parent


def read_env() -> dict[str, str]:
    path = ROOT / '.env'
    if not path.exists():
        raise SystemExit('Die .env-Datei fehlt. Zuerst: python scripts/setup.py --local')
    return dict(line.split('=', 1) for raw in path.read_text(encoding='utf-8').splitlines()
                if (line := raw.strip()) and not line.startswith('#') and '=' in line)


def main():
    settings = read_env()
    url = 'http://127.0.0.1:8000'
    cookies = http.cookiejar.CookieJar()
    opener = build_opener(HTTPCookieProcessor(cookies))
    csrf = ''

    def request(path: str, data=None, method: str | None = None):
        headers = {'Accept': 'application/json'}
        if data is not None:
            headers['Content-Type'] = 'application/json'
        if csrf and method not in (None, 'GET'):
            headers['X-CSRF-Token'] = csrf
        req = Request(url + path, data=json.dumps(data).encode() if data is not None else None,
                      method=method, headers=headers)
        try:
            with opener.open(req, timeout=8) as response:
                return json.load(response)
        except (URLError, HTTPError) as error:
            raise RuntimeError(f'API-Anfrage fehlgeschlagen: {path}: {error}') from error

    try:
        assert request('/healthz')['ok']
        config = request('/api/config')
        if config.get('app_mode') != 'demo':
            raise RuntimeError('Smoke test verweigert: der Server läuft nicht im Demomodus.')
        request('/api/login', {'username': settings['ADMIN_USERNAME'], 'password': settings['ADMIN_PASSWORD']}, 'POST')
        csrf = request('/api/me')['csrf']
        diagnostics = request('/api/diagnostics')
        assert diagnostics['smtp_listening'], 'SMTP-Server nicht erreichbar'
        new_alias = request('/api/aliases', {'local_part': 'smoke-' + secrets.token_hex(4)}, 'POST')
        address = new_alias['address']
        print('1/4: Alias erstellt:', address)
        assert request('/api/demo/send', {}, 'POST')['ok']
        print('2/4: Testnachricht über SMTP übertragen')
        inbox = request('/api/messages')['messages']
        assert any(m['subject'] == 'Dein lokaler E-Mail-Empfang funktioniert' for m in inbox)
        print('3/4: Nachricht im HTTP-Posteingang gefunden')
        request('/api/aliases/' + str(new_alias['id']), method='DELETE')
        print('4/4: Testadresse gelöscht')
        print('OK: Lokales HTTP + SMTP Ende-zu-Ende-Szenario erfolgreich.')
    except (AssertionError, KeyError, RuntimeError) as error:
        raise SystemExit('FEHLER: ' + str(error)) from error


if __name__ == '__main__':
    main()
