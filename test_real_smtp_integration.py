"""Real SMTP over TCP, alongside the HTTP API, not a mocked database injection."""
import socket
import smtplib
import pytest
from dataclasses import replace
from email.message import EmailMessage

from fastapi.testclient import TestClient

from server.main import create_app
from server.mailer import extract_message


def free_local_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def test_end_to_end_real_smtp_delivery(settings):
    pytest.importorskip("aiosmtpd", reason="SMTP integration dependency not installed")
    cfg = replace(settings, app_mode="demo", enable_smtp=True,
                  smtp_host="127.0.0.1", smtp_port=free_local_port())
    with TestClient(create_app(cfg)) as client:
        logged = client.post("/api/login", json={
            "username": "admin", "password": cfg.admin_password})
        assert logged.status_code == 200
        client.headers.update({"X-CSRF-Token": client.get("/api/me").json()["csrf"]})
        r = client.post("/api/aliases", json={"local_part": "mypostbox"})
        assert r.status_code == 201, r.text
        address = r.json()["address"]
        assert client.get("/api/diagnostics").json()["smtp_listening"] is True
        msg = EmailMessage()
        msg["From"] = "Sender <sender@example.net>"
        msg["To"] = address
        msg["Subject"] = "SMTP connection integration test"
        msg.set_content("The code is 123456, delivered via real SMTP")
        with smtplib.SMTP("127.0.0.1", cfg.smtp_port, timeout=5) as mail:
            mail.send_message(msg)
            with pytest.raises(smtplib.SMTPRecipientsRefused):
                mail.sendmail("sender@example.net", "unknown@example.org", msg.as_bytes())
        stored = client.get("/api/messages").json()["messages"]
        assert len(stored) == 1
        assert stored[0]["subject"] == "SMTP connection integration test"
        assert client.get(f"/api/messages/{stored[0]['id']}").json()["body"].startswith("The code")
        test = client.post("/api/demo/send")
        assert test.status_code == 200, test.text
        assert len(client.get("/api/messages").json()["messages"]) == 2


def test_html_only_verification_link_is_preserved():
    msg = EmailMessage()
    msg["From"] = "notices@example.net"
    msg["Subject"] = "Confirm your address"
    msg.set_content('''<html><body><p>Please confirm your address.</p>
      <a href="https://example.net/verify?token=abc&amp;lang=de">Confirm</a>
      <a href="javascript:alert(1)">bad</a>
      <script>alert('tracker')</script></body></html>''', subtype="html")
    _, _, body, _ = extract_message(msg.as_bytes())
    assert "https://example.net/verify?token=abc&lang=de" in body
    assert "javascript:" not in body
    assert "tracker" not in body


def test_demo_cannot_run_on_production(settings):
    cfg = replace(settings, app_mode="production", enable_smtp=False)
    with TestClient(create_app(cfg)) as client:
        assert client.post("/api/login", json={"username": "admin", "password": cfg.admin_password}).status_code == 200
        client.headers.update({"X-CSRF-Token": client.get("/api/me").json()["csrf"]})
        assert client.post("/api/demo/send").status_code == 404
