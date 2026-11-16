"""Offline PCAPHub contract/security tests; no real credentials or replay."""
import asyncio
import hashlib
from uuid import UUID
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI, HTTPException
from pydantic import SecretStr

from services import pcaphub_service as hub
from routers import pcaphub

REAL_SAVE_UPLOAD = hub.file_service.save_upload
ID = UUID('419d359d-bb5b-410c-b1e7-8ffe6696cd64')
PCAP = b'\xd4\xc3\xb2\xa1' + bytes(20)
META = {'id': str(ID), 'title': 'example', 'file_size': len(PCAP),
        'sha256': hashlib.sha256(PCAP).hexdigest()}


class Stream(httpx.AsyncByteStream):
    def __init__(self, data):
        self.data = data

    async def __aiter__(self):
        for offset in range(0, len(self.data), 7):
            yield self.data[offset:offset + 7]


@pytest.fixture(autouse=True)
def setup(monkeypatch, tmp_path):
    monkeypatch.setattr(hub.settings, 'pcaphub_api_key', SecretStr('test-server-secret'))
    monkeypatch.setattr(hub.settings, 'upload_folder', str(tmp_path))
    monkeypatch.setattr(hub.settings, 'pcaphub_max_download_bytes', 1024)
    monkeypatch.setattr(hub.file_service, 'save_upload', AsyncMock(return_value={'id': 'local-id'}))


def mock_remote(monkeypatch, handler):
    # Exercise the real client configuration and authentication, substituting transport only.
    real_client = httpx.AsyncClient
    def client(**kwargs):
        return real_client(**kwargs, transport=httpx.MockTransport(handler))
    monkeypatch.setattr(hub.httpx, 'AsyncClient', client)


def download_handler(body=PCAP, metadata=None, headers=None, code=200):
    def handler(request):
        assert request.url.host == 'pcaphub.com'
        assert request.headers['X-API-Key'] == 'test-server-secret'
        if request.url.path.endswith('/download'):
            return httpx.Response(code, headers=headers or {}, stream=Stream(body))
        return httpx.Response(200, json={'data': metadata or META})
    return handler


@pytest.mark.asyncio
async def test_public_search_contract_and_no_secret(monkeypatch):
    def handler(request):
        assert request.url.path == '/api/search'
        assert dict(request.url.params) == {'q': 'dns', 'page': '2', 'limit': '24', 'sort': 'newest'}
        assert 'X-API-Key' not in request.headers and 'Authorization' not in request.headers
        return httpx.Response(200, json={'data': [META], 'meta': {'total': 30, 'page': 2, 'limit': 24, 'total_pages': 2}})
    mock_remote(monkeypatch, handler)
    assert (await hub.search('dns', 2))['data'][0]['id'] == str(ID)
    assert 'test-server-secret' not in str(hub.status())


@pytest.mark.asyncio
async def test_public_search_filters_are_forwarded_without_credentials(monkeypatch):
    def handler(request):
        assert dict(request.url.params) == {'q': 'tunnel', 'page': '1', 'limit': '24',
                                          'sort': 'newest', 'protocol': 'DNS', 'tag': 'dns'}
        assert 'X-API-Key' not in request.headers and 'Authorization' not in request.headers
        return httpx.Response(200, json={'data': [], 'meta': {'total': 0, 'page': 1, 'limit': 24, 'total_pages': 0}})
    mock_remote(monkeypatch, handler)
    assert (await hub.search('tunnel', protocol='DNS', tag='dns'))['data'] == []


@pytest.mark.asyncio
async def test_search_route_filter_validation(monkeypatch):
    app = FastAPI()
    app.include_router(pcaphub.router, prefix='/api')
    search = AsyncMock(return_value={'data': []})
    monkeypatch.setattr(hub, 'search', search)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
        assert (await client.get('/api/pcaphub/search?protocol=DNS&tag=dns')).status_code == 200
        search.assert_awaited_once_with('', 1, 24, 'newest', 'DNS', 'dns')
        for query in ['protocol=' + 'a' * 101, 'tag=' + 'a' * 101, 'sort=unsupported', 'page=10001']:
            assert (await client.get('/api/pcaphub/search?' + query)).status_code == 422


@pytest.mark.asyncio
async def test_valid_import_sanitizes_and_reuses_pipeline(monkeypatch):
    mock_remote(monkeypatch, download_handler(headers={'Content-Disposition': 'attachment; filename="../../evil name.pcap"'}))
    assert await hub.import_capture(ID) == {'id': 'local-id'}
    upload = hub.file_service.save_upload.call_args.args[0]
    assert upload.filename == 'evil_name.pcap'
    assert upload.file.closed


@pytest.mark.asyncio
@pytest.mark.parametrize('body,metadata,headers,code,expected', [
    (b'<html>' * 4, META, {}, 200, 422),
    (PCAP, {**META, 'sha256': '0' * 64}, {}, 200, 422),
    (PCAP, {**META, 'sha256': None}, {}, 200, 502),
    (PCAP, {**META, 'sha256': 'bad'}, {}, 200, 502),
    (PCAP, {**META, 'file_size': 2000}, {}, 200, 413),
    (PCAP, META, {'Content-Length': '2000'}, 200, 413),
    (PCAP + bytes(2000), META, {}, 200, 413),
    (PCAP[:8], META, {}, 200, 422),
    (PCAP, META, {'Location': 'https://attacker.invalid/secret'}, 302, 502),
    (PCAP, META, {'Content-Encoding': 'gzip'}, 200, 502),
    (PCAP, META, {}, 401, 502),
    (PCAP, META, {}, 404, 404),
    (PCAP, META, {}, 429, 503),
])
async def test_import_rejects_unsafe_responses(monkeypatch, tmp_path, body, metadata, headers, code, expected):
    requests = []
    handler = download_handler(body, metadata, headers, code)
    def tracked(request):
        requests.append(request)
        return handler(request)
    mock_remote(monkeypatch, tracked)
    with pytest.raises(HTTPException) as error:
        await hub.import_capture(ID)
    assert error.value.status_code == expected
    assert 'test-server-secret' not in error.value.detail
    hub.file_service.save_upload.assert_not_awaited()
    assert not list(tmp_path.iterdir())
    assert all(r.url.host == 'pcaphub.com' for r in requests)


@pytest.mark.asyncio
async def test_missing_key(monkeypatch):
    monkeypatch.setattr(hub.settings, 'pcaphub_api_key', None)
    with pytest.raises(HTTPException) as error:
        await hub.import_capture(ID)
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_timeout_redacts_upstream_error(monkeypatch):
    def handler(request):
        raise httpx.ReadTimeout('test-server-secret', request=request)
    mock_remote(monkeypatch, handler)
    with pytest.raises(HTTPException) as error:
        await hub.import_capture(ID)
    assert error.value.status_code == 504
    assert 'test-server-secret' not in error.value.detail


@pytest.mark.asyncio
async def test_routes_validation_busy_and_analysis_only(monkeypatch):
    app = FastAPI()
    app.include_router(pcaphub.router, prefix='/api')
    monkeypatch.setattr(pcaphub, '_import_lock', asyncio.Lock())
    imported = AsyncMock(return_value={'id': 'local-id'})
    analyze = AsyncMock()
    monkeypatch.setattr(hub, 'import_capture', imported)
    monkeypatch.setattr(pcaphub, '_analyze_bg', analyze)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
        assert (await client.post('/api/pcaphub/captures/not-a-uuid/import')).status_code == 422
        assert (await client.get('/api/pcaphub/search?limit=999')).status_code == 422
        async with pcaphub._import_lock:
            assert (await client.post(f'/api/pcaphub/captures/{ID}/import')).status_code == 409
        assert (await client.post(f'/api/pcaphub/captures/{ID}/import')).status_code == 201
        await asyncio.sleep(0)
    imported.assert_awaited_once_with(ID)
    analyze.assert_awaited_once_with('local-id')


@pytest.mark.asyncio
async def test_import_persists_real_library_without_replay(monkeypatch, tmp_path):
    import database
    monkeypatch.setattr(hub.settings, 'db_path', str(tmp_path / 'test.db'))
    monkeypatch.setattr(hub.file_service, 'save_upload', REAL_SAVE_UPLOAD)
    mock_remote(monkeypatch, download_handler())
    try:
        await database.init_db()
        result = await hub.import_capture(ID)
        saved = await hub.file_service.get_file(result['id'])
        from pathlib import Path
        assert Path(saved['file_path']).read_bytes() == PCAP
        db = await database.get_db()
        cursor = await db.execute('SELECT count(*) FROM replays')
        assert (await cursor.fetchone())[0] == 0
    finally:
        await database.close_db()


@pytest.mark.asyncio
async def test_bearer_mode(monkeypatch):
    monkeypatch.setattr(hub.settings, 'pcaphub_auth_mode', 'bearer')
    def handler(request):
        assert request.headers['Authorization'] == 'Bearer test-server-secret'
        assert 'X-API-Key' not in request.headers
        if request.url.path.endswith('/download'):
            return httpx.Response(200, stream=Stream(PCAP))
        return httpx.Response(200, json={'data': META})
    mock_remote(monkeypatch, handler)
    await hub.import_capture(ID)


@pytest.mark.asyncio
@pytest.mark.parametrize('payload', [[], {'data': None}, {'data': {}}])
async def test_malformed_metadata(monkeypatch, payload):
    mock_remote(monkeypatch, lambda request: httpx.Response(200, json=payload))
    with pytest.raises(HTTPException) as error:
        await hub.import_capture(ID)
    assert error.value.status_code == 502
    hub.file_service.save_upload.assert_not_awaited()

