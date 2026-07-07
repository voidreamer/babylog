"""
Tests for the voice/Bubsense parse endpoint.

The Groq call itself is mocked — these cover the tool schema the LLM sees,
the params passthrough (createPotty, minutes_ago), and confirmation text.
"""
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

    def test_minutes_ago_passthrough(
        self, client, auth_headers, sample_baby_data, monkeypatch
    ):
        baby_id = self._create_baby(client, auth_headers, sample_baby_data)
        _mock_groq(
            monkeypatch,
            "createFeeding",
            '{"type": "bottle", "amount_ml": 120, "minutes_ago": 20}',
        )

        resp = client.post(
            "/voice/parse",
            json={"transcript": "120ml bottle 20 minutes ago", "baby_id": baby_id},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "action"
        assert data["action"] == "createFeeding"
        # The client back-dates the timestamp from minutes_ago; the server
        # passes it through untouched.
        assert data["params"]["minutes_ago"] == 20
