"""
Tests for the voice/Bubsense parse endpoint.

The Groq call itself is mocked — these cover the tool schema the LLM sees,
the params passthrough (createPotty, minutes_ago), and confirmation text.
"""
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import httpx

from app.routers import voice as voice_module
from app.routers.voice import TOOLS, _generate_confirmation

TOOL_BY_NAME = {t["function"]["name"]: t["function"] for t in TOOLS}

POINT_IN_TIME_TOOLS = [
    "createFeeding",
    "createDiaper",
    "createPumping",
    "createTummyTime",
    "createBath",
    "createSupplement",
    "createSolid",
    "createPotty",
]


class TestToolSchema:
    def test_potty_tool_exists(self):
        potty = TOOL_BY_NAME["createPotty"]
        props = potty["parameters"]["properties"]
        assert props["result"]["enum"] == ["success", "accident", "attempt"]
        assert props["potty_type"]["enum"] == ["pee", "poo", "both"]
        assert potty["parameters"]["required"] == ["result"]

    def test_minutes_ago_on_point_in_time_tools(self):
        for name in POINT_IN_TIME_TOOLS:
            props = TOOL_BY_NAME[name]["parameters"]["properties"]
            assert "minutes_ago" in props, f"{name} should support minutes_ago"
            # Retro-logging must stay optional.
            assert "minutes_ago" not in TOOL_BY_NAME[name]["parameters"].get("required", [])

    def test_minutes_ago_not_on_sleep_or_meta_tools(self):
        # startSleep/endSleep interact with the active-sleep guard; getStatus
        # and askClarification aren't events at all.
        for name in ["startSleep", "endSleep", "getStatus", "askClarification"]:
            props = TOOL_BY_NAME[name]["parameters"]["properties"]
            assert "minutes_ago" not in props, f"{name} must not support minutes_ago"


class TestConfirmation:
    def test_potty_confirmation(self):
        text = _generate_confirmation("createPotty", {"result": "success"}, "Mila")
        assert "potty" in text
        assert "success" in text
        assert "Mila" in text


def _mock_groq(monkeypatch, tool_name, arguments_json):
    """Route the Groq HTTP call to a canned tool-call response."""
    payload = {
        "choices": [
            {
                "message": {
                    "tool_calls": [
                        {
                            "function": {
                                "name": tool_name,
                                "arguments": arguments_json,
                            }
                        }
                    ]
                }
            }
        ]
    }

    async def fake_post(self, url, **kwargs):
        return httpx.Response(200, json=payload, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    monkeypatch.setattr(
        voice_module, "get_settings", lambda: SimpleNamespace(groq_api_key="test-key")
    )


class TestParseEndpoint:
    def _create_baby(self, client, auth_headers, sample_baby_data):
        resp = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        assert resp.status_code == 201
        return resp.json()["id"]

    def test_unconfigured_returns_503(self, client, auth_headers, monkeypatch):
        monkeypatch.setattr(
            voice_module, "get_settings", lambda: SimpleNamespace(groq_api_key=None)
        )
        resp = client.post(
            "/voice/parse",
            json={"transcript": "wet diaper", "baby_id": 1},
            headers=auth_headers,
        )
        assert resp.status_code == 503

    def test_potty_action_passthrough(
        self, client, auth_headers, sample_baby_data, monkeypatch
    ):
        baby_id = self._create_baby(client, auth_headers, sample_baby_data)
        _mock_groq(monkeypatch, "createPotty", '{"result": "success", "potty_type": "pee"}')

        resp = client.post(
            "/voice/parse",
            json={"transcript": "she used the potty, pee", "baby_id": baby_id},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "action"
        assert data["action"] == "createPotty"
        assert data["params"] == {"result": "success", "potty_type": "pee"}
        assert "potty" in data["confirmation_text"]

    def _parse(self, client, auth_headers, baby_id, transcript):
        resp = client.post(
            "/voice/parse",
            json={"transcript": transcript, "baby_id": baby_id},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        return resp.json()

    def test_minutes_ago_resolved_to_time(
        self, client, auth_headers, sample_baby_data, monkeypatch
    ):
        baby_id = self._create_baby(client, auth_headers, sample_baby_data)
        _mock_groq(
            monkeypatch,
            "createFeeding",
            '{"type": "bottle", "amount_ml": 120, "minutes_ago": 20}',
        )

        data = self._parse(client, auth_headers, baby_id, "120ml bottle 20 minutes ago")
        assert data["type"] == "action"
        assert data["action"] == "createFeeding"
        # The server owns "now": minutes_ago is resolved into a concrete
        # timestamp and never reaches the client.
        assert "minutes_ago" not in data["params"]
        resolved = datetime.fromisoformat(data["params"]["time"].replace("Z", "+00:00"))
        expected = datetime.now(UTC) - timedelta(minutes=20)
        assert abs((resolved - expected).total_seconds()) < 60

    def test_minutes_ago_string_is_coerced(
        self, client, auth_headers, sample_baby_data, monkeypatch
    ):
        baby_id = self._create_baby(client, auth_headers, sample_baby_data)
        _mock_groq(monkeypatch, "createDiaper", '{"type": "pee", "minutes_ago": "45"}')

        data = self._parse(client, auth_headers, baby_id, "wet diaper 45 min ago")
        resolved = datetime.fromisoformat(data["params"]["time"].replace("Z", "+00:00"))
        expected = datetime.now(UTC) - timedelta(minutes=45)
        assert abs((resolved - expected).total_seconds()) < 60

    def test_minutes_ago_clamped_to_24h(
        self, client, auth_headers, sample_baby_data, monkeypatch
    ):
        baby_id = self._create_baby(client, auth_headers, sample_baby_data)
        _mock_groq(monkeypatch, "createBath", '{"minutes_ago": 999999}')

        data = self._parse(client, auth_headers, baby_id, "bath ages ago")
        resolved = datetime.fromisoformat(data["params"]["time"].replace("Z", "+00:00"))
        expected = datetime.now(UTC) - timedelta(hours=24)
        assert abs((resolved - expected).total_seconds()) < 60

    def test_minutes_ago_ignored_on_start_sleep(
        self, client, auth_headers, sample_baby_data, monkeypatch
    ):
        baby_id = self._create_baby(client, auth_headers, sample_baby_data)
        # Sleep tools don't declare minutes_ago, but nothing forces the LLM to
        # comply — a hallucinated value must never back-date a session.
        _mock_groq(monkeypatch, "startSleep", '{"minutes_ago": 30}')

        data = self._parse(client, auth_headers, baby_id, "she fell asleep 30 min ago")
        assert data["action"] == "startSleep"
        assert "minutes_ago" not in data["params"]
        assert "time" not in data["params"]
