"""Effect endpoints must reject a missing or unknown session token.

``GET /lcars/manifest`` is the one session-issuance point. Every endpoint that
*applies* an effect — ``/lcars/action/{id}``, ``/lcars/input/{id}``,
``/lcars/form/{id}`` and both upload routes — used to find-or-mint instead: a
request with no token (or one the server never issued) quietly created a
throwaway session, answered ``action_ack: ok``, and applied the effect to a
session no client was connected to. The caller was told the work succeeded
while it was being discarded. These tests pin the loud behaviour that replaced
it, and prove the ordinary browser flow is unaffected.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import lcars_ui as lcars
from lcars_ui import ActionContext, App, ui
from lcars_ui.app import create_app
from lcars_ui.server.sessions import SESSION_TOKEN_HEADER

EFFECT_REQUESTS = [
    ("/lcars/action/touch", {"json": {"value": "go"}}),
    ("/lcars/input/note", {"json": {"value": "typed"}}),
    ("/lcars/form/ops", {"json": {"data": {"field": "value"}}}),
    ("/lcars/upload/audio", {"files": {"file": ("clip.wav", b"abc", "audio/wav")}}),
    (
        "/lcars/upload/files",
        {
            "data": {"action_id": "receive"},
            "files": {"files": ("d.bin", b"abc", "application/octet-stream")},
        },
    ),
]


def _app(seen: list[str]) -> App:
    app = App()

    @app.page("Root", id="root")
    def root() -> None:
        lcars.config("Session Token", settings_page=False)
        ui.button("Touch", id="touch")
        ui.text_input("Note", id="note")

    @app.action("touch")
    def touch(ctx: ActionContext[object]) -> None:
        seen.append(ctx.session_id)

    return app


@pytest.mark.parametrize("path,kwargs", EFFECT_REQUESTS, ids=lambda value: str(value)[:24])
def test_effect_endpoint_rejects_a_request_with_no_session_token(
    path: str, kwargs: dict[str, object]
) -> None:
    seen: list[str] = []
    app = _app(seen)
    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        response = client.post(path, **kwargs)  # type: ignore[arg-type]

    assert response.status_code == 401, "a tokenless effect must not be accepted"
    detail = response.json()["detail"]
    assert detail["error"] == "session_required"
    # The rejection has to say what is missing and how to get it.
    assert detail["session_token_header"] == SESSION_TOKEN_HEADER
    assert detail["issue_endpoint"] == "/lcars/manifest"
    assert SESSION_TOKEN_HEADER in detail["detail"]
    assert "/lcars/manifest" in detail["detail"]
    assert seen == [], "the handler must never have run"


@pytest.mark.parametrize("path,kwargs", EFFECT_REQUESTS, ids=lambda value: str(value)[:24])
def test_effect_endpoint_rejects_an_unrecognised_session_token(
    path: str, kwargs: dict[str, object]
) -> None:
    seen: list[str] = []
    app = _app(seen)
    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        response = client.post(
            path,
            headers={SESSION_TOKEN_HEADER: "not-a-token-this-server-ever-issued"},
            **kwargs,  # type: ignore[arg-type]
        )

    assert response.status_code == 401
    detail = response.json()["detail"]
    assert detail["error"] == "unknown_session"
    assert "/lcars/manifest" in detail["detail"]
    assert seen == []


def test_a_rejected_action_never_mints_a_session() -> None:
    """The rejection must not leave a throwaway session behind either."""
    seen: list[str] = []
    app = _app(seen)
    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        client.post("/lcars/action/touch", json={"value": "go"})
        client.post(
            "/lcars/action/touch",
            headers={SESSION_TOKEN_HEADER: "bogus"},
            json={"value": "go"},
        )
        assert app.session_registry._records == {}

        # And the response carries no freshly minted token to latch onto.
        response = client.post("/lcars/action/touch", json={"value": "go"})
        assert SESSION_TOKEN_HEADER not in response.headers


def test_manifest_still_issues_a_session_for_a_tokenless_request() -> None:
    """Issuance stays exactly where it was: the manifest fetch."""
    seen: list[str] = []
    app = _app(seen)
    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        response = client.get("/lcars/manifest")

    assert response.status_code == 200
    assert response.headers[SESSION_TOKEN_HEADER]


def test_the_ordinary_browser_flow_still_works_end_to_end() -> None:
    """Fetch the manifest, connect, act — the real frontend sequence.

    The frontend fetches ``/lcars/manifest`` before it opens a transport or
    renders a control, so it always holds a token by the time any effect
    endpoint is reachable. This is the regression guard for that path.
    """
    seen: list[str] = []
    app = _app(seen)
    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        # 1. Boot: manifest fetch mints the session and returns the token.
        manifest_response = client.get("/lcars/manifest")
        assert manifest_response.status_code == 200
        assert manifest_response.json()["meta"]["version"] == "2.0"
        token = manifest_response.headers[SESSION_TOKEN_HEADER]
        headers = {SESSION_TOKEN_HEADER: token}

        # 2. Live transport, carrying that same token as a query parameter.
        with client.websocket_connect(f"/lcars/ws?session={token}") as websocket:
            hydration = websocket.receive_json()
            assert hydration["type"] == "session_hydration"

            # 3. HTTP-fallback action, carrying the token as a header.
            action = client.post("/lcars/action/touch", headers=headers, json={"value": "go"})
            assert action.status_code == 200
            assert action.json()["payload"] == {"action_id": "touch", "status": "ok"}

            # 4. And input and form submits over the same session.
            assert (
                client.post(
                    "/lcars/input/note", headers=headers, json={"value": "typed"}
                ).status_code
                == 200
            )
            assert (
                client.post(
                    "/lcars/form/ops", headers=headers, json={"data": {"a": "b"}}
                ).status_code
                == 200
            )

        # The action ran once, under the session the manifest fetch issued.
        assert len(seen) == 1

    # A reload reuses the stored token and lands on the same session.
    with TestClient(runtime) as client:
        again = client.get("/lcars/manifest", headers=headers)
        assert again.status_code == 200
        assert client.post(
            "/lcars/action/touch", headers=headers, json={"value": "again"}
        ).status_code == 200
        assert seen[-1] == seen[0]
