import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Call Analyst" in data["service"]


@pytest.mark.asyncio
async def test_protocols_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/protocols")
    assert response.status_code == 200
    protocols = response.json()
    assert len(protocols) >= 3
    assert any(p["code"] == "CBT-PANIC-CLARK" for p in protocols)


@pytest.mark.asyncio
async def test_templates_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/templates")
    assert response.status_code == 200
    templates = response.json()
    assert len(templates) >= 3
    assert any(t["domain"] == "psychology" for t in templates)
    assert any(t["domain"] == "sales" for t in templates)


@pytest.mark.asyncio
async def test_clients_and_dossier():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # List clients
        res = await ac.get("/api/v1/clients")
        assert res.status_code == 200
        clients = res.json()
        assert len(clients) >= 1
        client_id = clients[0]["id"]

        # Get client details
        client_res = await ac.get(f"/api/v1/clients/{client_id}")
        assert client_res.status_code == 200
        client_data = client_res.json()
        assert client_data["dossier"] is not None
        assert "therapeutic_goals" in client_data["dossier"]

        # Test longitudinal analysis
        long_res = await ac.post(f"/api/v1/clients/{client_id}/longitudinal-analysis")
        assert long_res.status_code == 200
        long_data = long_res.json()
        assert "case_formulation" in long_data
        assert len(long_data["recommended_interventions"]) > 0


@pytest.mark.asyncio
async def test_session_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Get client
        clients_res = await ac.get("/api/v1/clients")
        client_id = clients_res.json()[0]["id"]

        # 1. Create new recording session
        create_res = await ac.post("/api/v1/sessions", json={
            "client_id": client_id,
            "title": "Тестовая сессия #2"
        })
        assert create_res.status_code == 200
        session_id = create_res.json()["id"]

        # 2. Add real-time timestamped note during call
        note_res = await ac.post(f"/api/v1/sessions/{session_id}/notes", json={
            "timestamp_seconds": 15.5,
            "content": "Замечен триггер избегания",
            "category": "observation"
        })
        assert note_res.status_code == 200
        assert note_res.json()["timestamp_seconds"] == 15.5

        # 3. Finish and analyze session
        finish_res = await ac.post(f"/api/v1/sessions/{session_id}/finish")
        assert finish_res.status_code == 200
        session_data = finish_res.json()
        assert session_data["status"] == "completed"
        assert len(session_data["utterances"]) > 0
        assert session_data["analysis"] is not None
        assert len(session_data["analysis"]["strengths"]) > 0
        assert len(session_data["analysis"]["recommended_interventions"]) > 0


@pytest.mark.asyncio
async def test_session_with_real_audio_upload_and_stream():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        clients_res = await ac.get("/api/v1/clients")
        client_id = clients_res.json()[0]["id"]

        # Create session
        create_res = await ac.post("/api/v1/sessions", json={
            "client_id": client_id,
            "title": "Сессия с реальным аудиофайлом"
        })
        assert create_res.status_code == 200
        session_id = create_res.json()["id"]

        # Finish with multipart audio file upload
        fake_audio_content = b"RIFF....WAVEfmt ....data...."
        files = {"audio_file": ("test_recording.wav", fake_audio_content, "audio/wav")}
        finish_res = await ac.post(f"/api/v1/sessions/{session_id}/finish", files=files)
        assert finish_res.status_code == 200
        session_data = finish_res.json()
        assert session_data["audio_file_path"] is not None

        # Test audio streaming endpoint
        audio_stream_res = await ac.get(f"/api/v1/sessions/{session_id}/audio")
        assert audio_stream_res.status_code == 200
        assert len(audio_stream_res.content) == len(fake_audio_content)


@pytest.mark.asyncio
async def test_session_notes_and_utterances_retrieval():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        clients_res = await ac.get("/api/v1/clients")
        client_id = clients_res.json()[0]["id"]

        create_res = await ac.post("/api/v1/sessions", json={
            "client_id": client_id,
            "title": "Сессия для проверки таймлайна"
        })
        session_id = create_res.json()["id"]

        # Add 2 notes
        await ac.post(f"/api/v1/sessions/{session_id}/notes", json={
            "timestamp_seconds": 5.0,
            "content": "Вводная часть, контакт установлен",
            "category": "observation"
        })
        await ac.post(f"/api/v1/sessions/{session_id}/notes", json={
            "timestamp_seconds": 45.0,
            "content": "Интервенция: когнитивная реструктуризация",
            "category": "intervention"
        })

        # Finish session
        finish_res = await ac.post(f"/api/v1/sessions/{session_id}/finish")
        assert finish_res.status_code == 200

        # Fetch session
        get_res = await ac.get(f"/api/v1/sessions/{session_id}")
        assert get_res.status_code == 200
        data = get_res.json()
        assert len(data["notes"]) == 2
        assert len(data["utterances"]) > 0
        assert any(u["speaker"] == "Психолог" for u in data["utterances"])
        assert any(u["speaker"] == "Клиент" for u in data["utterances"])


