import asyncio
import base64
import io
import json
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from PIL import Image
import pytest
from starlette.datastructures import Headers, UploadFile

from backend import server


class FakeAdminsCollection:
    async def find_one(self, query, projection=None):
        return {'id': query.get('id'), 'role': 'admin'}


class FakeAdminDatabase:
    admins = FakeAdminsCollection()


def make_image(image_format, mode='RGB'):
    image = Image.new(mode, (4, 4), (12, 34, 56, 0) if mode == 'RGBA' else (12, 34, 56))
    output = io.BytesIO()
    image.save(output, format=image_format)
    return output.getvalue()


def make_upload(filename, mime_type, content):
    return UploadFile(
        filename=filename,
        file=io.BytesIO(content),
        headers=Headers({'content-type': mime_type}),
    )


def asgi_request(path, method='GET', body=b'', headers=None):
    async def run_request():
        events = []
        received = False

        async def receive():
            nonlocal received
            if not received:
                received = True
                return {'type': 'http.request', 'body': body, 'more_body': False}
            return {'type': 'http.disconnect'}

        async def send(event):
            events.append(event)

        encoded_path = path.encode('ascii')
        scope = {
            'type': 'http',
            'asgi': {'version': '3.0', 'spec_version': '2.3'},
            'http_version': '1.1',
            'method': method,
            'scheme': 'http',
            'path': path,
            'raw_path': encoded_path,
            'query_string': b'',
            'root_path': '',
            'headers': [
                (key.lower().encode('ascii'), value.encode('latin-1'))
                for key, value in (headers or {}).items()
            ],
            'client': ('test', 123),
            'server': ('test', 80),
        }
        await server.app(scope, receive, send)
        response = next(event for event in events if event['type'] == 'http.response.start')
        response_body = b''.join(
            event.get('body', b'') for event in events if event['type'] == 'http.response.body'
        )
        return response['status'], json.loads(response_body) if response_body else None

    return asyncio.run(run_request())


def auth_headers(monkeypatch):
    test_secret = 'test-jwt-secret-for-upload-tests-at-least-32-bytes'
    monkeypatch.setenv('JWT_SECRET', test_secret)
    monkeypatch.setattr(server, 'db', FakeAdminDatabase())
    token = server.jwt.encode(
        {'sub': 'admin-test', 'exp': datetime.now(timezone.utc) + timedelta(minutes=5)},
        test_secret,
        algorithm='HS256',
    )
    return {'Authorization': f'Bearer {token}'}


def multipart_file(filename, mime_type, content):
    boundary = 'garageboy-image-test-boundary'
    header = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f'Content-Type: {mime_type}\r\n\r\n'
    ).encode('ascii')
    body = header + content + f'\r\n--{boundary}--\r\n'.encode('ascii')
    return body, {'Content-Type': f'multipart/form-data; boundary={boundary}'}


def test_upload_status_requires_admin_jwt():
    status, body = asgi_request('/api/admin/uploads/status')

    assert status == 401
    assert body['detail'] == 'Admin authentication required'


def test_upload_status_reports_github_without_exposing_token(monkeypatch):
    headers = auth_headers(monkeypatch)
    monkeypatch.setenv('GITHUB_TOKEN', 'test-github-token')
    monkeypatch.setenv('GITHUB_REPOSITORY', 'AUTMAGMA/garageboy.id')
    monkeypatch.setenv('GITHUB_BRANCH', 'main')
    monkeypatch.setenv('FRONTEND_BASE_URL', 'https://garageboy-web.vercel.app')

    status, body = asgi_request('/api/admin/uploads/status', headers=headers)

    assert status == 200
    assert body['configured'] is True
    assert body['provider'] == 'github'
    assert body['repository'] == 'AUTMAGMA/garageboy.id'
    assert body['branch'] == 'main'
    assert body['upload_path'] == 'frontend/public/uploads/'
    assert body['public_base_url'] == 'https://garageboy-web.vercel.app'
    assert 'token' not in body
    assert 'test-github-token' not in json.dumps(body)


def test_upload_status_is_unconfigured_without_github_token(monkeypatch):
    headers = auth_headers(monkeypatch)
    monkeypatch.delenv('GITHUB_TOKEN', raising=False)
    monkeypatch.setenv('GITHUB_REPOSITORY', 'AUTMAGMA/garageboy.id')
    monkeypatch.setenv('GITHUB_BRANCH', 'main')
    monkeypatch.setenv('FRONTEND_BASE_URL', 'https://garageboy-web.vercel.app')

    status, body = asgi_request('/api/admin/uploads/status', headers=headers)

    assert status == 200
    assert body['configured'] is False
    assert body['provider'] == 'github'
    assert 'GITHUB_TOKEN' in body['message']
    assert 'S3' not in json.dumps(body)


def test_upload_requires_admin_jwt():
    body, headers = multipart_file('photo.jpg', 'image/jpeg', make_image('JPEG'))

    status, response = asgi_request('/api/admin/uploads', method='POST', body=body, headers=headers)

    assert status == 401
    assert response['detail'] == 'Admin authentication required'


@pytest.mark.parametrize(
    ('filename', 'mime_type', 'content', 'expected_extension', 'expected_content_type', 'expected_format'),
    [
        ('product.jpg', 'image/jpeg', make_image('JPEG'), 'webp', 'image/webp', 'WEBP'),
        ('logo.png', 'image/png', make_image('PNG', 'RGBA'), 'png', 'image/png', 'PNG'),
        ('part.webp', 'image/webp', make_image('WEBP'), 'webp', 'image/webp', 'WEBP'),
        (
            'logo.svg',
            'image/svg+xml',
            b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
            'svg',
            'image/svg+xml',
            None,
        ),
    ],
)
def test_authenticated_upload_commits_supported_image_formats(
    monkeypatch, filename, mime_type, content, expected_extension, expected_content_type, expected_format,
):
    headers = auth_headers(monkeypatch)
    monkeypatch.setenv('GITHUB_TOKEN', 'test-github-token')
    monkeypatch.setenv('GITHUB_REPOSITORY', 'AUTMAGMA/garageboy.id')
    monkeypatch.setenv('GITHUB_BRANCH', 'main')
    monkeypatch.setenv('FRONTEND_BASE_URL', 'https://garageboy-web.vercel.app')
    captured = {}

    class FakeResponse:
        status_code = 201

    def fake_put(url, **kwargs):
        captured['url'] = url
        captured.update(kwargs)
        return FakeResponse()

    monkeypatch.setattr(server.requests, 'put', fake_put)
    body, file_headers = multipart_file(filename, mime_type, content)
    headers.update(file_headers)

    status, response = asgi_request('/api/admin/uploads', method='POST', body=body, headers=headers)

    assert status == 200
    assert response['url'].startswith('https://garageboy-web.vercel.app/uploads/')
    assert response['url'].endswith(f'.{expected_extension}')
    assert response['content_type'] == expected_content_type
    assert response['branch'] == 'main'
    assert response['path'].startswith('frontend/public/uploads/')
    assert captured['url'].startswith('https://api.github.com/repos/AUTMAGMA/garageboy.id/contents/')
    assert captured['headers']['Authorization'] == 'Bearer test-github-token'
    assert captured['json']['branch'] == 'main'
    uploaded = base64.b64decode(captured['json']['content'])
    if expected_format:
        assert Image.open(io.BytesIO(uploaded)).format == expected_format
    else:
        assert b'<script' not in uploaded
        assert b'svg' in uploaded and b'rect' in uploaded
    assert 'test-github-token' not in json.dumps(response)


def test_jpeg_png_and_webp_are_validated_and_optimized():
    jpeg_result = asyncio.run(server.prepare_uploaded_image(make_upload('photo.jpg', 'image/jpeg', make_image('JPEG'))))
    png_result = asyncio.run(server.prepare_uploaded_image(make_upload('logo.png', 'image/png', make_image('PNG', 'RGBA'))))
    webp_result = asyncio.run(server.prepare_uploaded_image(make_upload('part.webp', 'image/webp', make_image('WEBP'))))

    assert jpeg_result[1:] == ('webp', 'image/webp')
    assert Image.open(io.BytesIO(jpeg_result[0])).format == 'WEBP'
    assert png_result[1:] == ('png', 'image/png')
    png = Image.open(io.BytesIO(png_result[0]))
    assert png.format == 'PNG' and png.mode == 'RGBA' and png.getpixel((0, 0))[3] == 0
    assert webp_result[1:] == ('webp', 'image/webp')
    assert Image.open(io.BytesIO(webp_result[0])).format == 'WEBP'


def test_safe_svg_is_sanitized_and_active_svg_is_rejected():
    safe_svg = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>'
    result = asyncio.run(server.prepare_uploaded_image(make_upload('logo.svg', 'image/svg+xml', safe_svg)))

    assert result[1:] == ('svg', 'image/svg+xml')
    assert b'svg' in result[0]
    active_svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    with pytest.raises(HTTPException) as exception:
        asyncio.run(server.prepare_uploaded_image(make_upload('bad.svg', 'image/svg+xml', active_svg)))
    assert exception.value.status_code == 415


def test_invalid_signature_and_oversized_upload_are_rejected():
    with pytest.raises(HTTPException) as invalid:
        asyncio.run(server.prepare_uploaded_image(make_upload('fake.jpg', 'image/jpeg', b'not a jpeg')))
    assert invalid.value.status_code == 415

    oversized = b'0' * (server.MAX_IMAGE_UPLOAD_BYTES + 1)
    with pytest.raises(HTTPException) as too_large:
        asyncio.run(server.prepare_uploaded_image(make_upload('large.jpg', 'image/jpeg', oversized)))
    assert too_large.value.status_code == 413


def test_authenticated_upload_rejects_invalid_signature_and_oversized_file(monkeypatch):
    headers = auth_headers(monkeypatch)
    monkeypatch.setenv('GITHUB_TOKEN', 'test-github-token')
    monkeypatch.setenv('GITHUB_REPOSITORY', 'AUTMAGMA/garageboy.id')
    monkeypatch.setenv('GITHUB_BRANCH', 'main')
    monkeypatch.setattr(server.requests, 'put', lambda *args, **kwargs: pytest.fail('GitHub API must not be called'))

    invalid_body, invalid_headers = multipart_file('fake.jpg', 'image/jpeg', b'not a jpeg')
    headers.update(invalid_headers)
    status, response = asgi_request('/api/admin/uploads', method='POST', body=invalid_body, headers=headers)
    assert status == 415
    assert response['detail'] == 'File gambar rusak atau tidak dapat diproses'

    oversized_body, oversized_headers = multipart_file(
        'large.jpg', 'image/jpeg', b'0' * (server.MAX_IMAGE_UPLOAD_BYTES + 1),
    )
    headers.update(oversized_headers)
    status, response = asgi_request('/api/admin/uploads', method='POST', body=oversized_body, headers=headers)
    assert status == 413
    assert response['detail'] == 'Ukuran gambar maksimal 10 MB'
