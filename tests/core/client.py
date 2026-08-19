import json
import os
import urllib.request
import urllib.error
import urllib.parse
import uuid
from typing import Tuple, Dict, Any, Optional

from tests.config import BASE_URL

class ApiClient:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")

    def request(
        self,
        method: str,
        path: str,
        *,
        headers: Optional[Dict[str, str]] = None,
        body: Optional[bytes] = None,
        timeout: int = 60,
        host_port: Optional[Tuple[str, int]] = None
    ) -> Tuple[int, Any, Dict[str, str]]:
        if host_port:
            host, port = host_port
            url = f"http://{host}:{port}{path}"
        else:
            url = f"{self.base_url}{path}" if path.startswith("/") else f"{self.base_url}/{path}"

        req = urllib.request.Request(url, data=body, headers=headers or {}, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                resp_headers = dict(resp.headers)
                try:
                    return resp.status, json.loads(raw), resp_headers
                except Exception:
                    return resp.status, raw.decode("utf-8", errors="replace"), resp_headers
        except urllib.error.HTTPError as e:
            raw = e.read()
            resp_headers = dict(e.headers)
            try:
                return e.code, json.loads(raw), resp_headers
            except Exception:
                return e.code, raw.decode("utf-8", errors="replace"), resp_headers
        except Exception as ex:
            return 0, str(ex), {}

    def json_request(
        self,
        method: str,
        path: str,
        *,
        token: Optional[str] = None,
        body: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 60,
        host_port: Optional[Tuple[str, int]] = None
    ) -> Tuple[int, Any, Dict[str, str]]:
        h = {"Content-Type": "application/json"}
        if headers:
            h.update(headers)
        if token:
            h["Authorization"] = f"Bearer {token}"
        data = json.dumps(body).encode("utf-8") if body is not None else None
        return self.request(method, path, headers=h, body=data, timeout=timeout, host_port=host_port)

    def upload_file(
        self,
        workspace_id: str,
        filepath: str,
        token: str,
        endpoint: str = "/api/v1/documents/raw",
        timeout: int = 120
    ) -> Tuple[int, Any, Dict[str, str]]:
        if not os.path.exists(filepath):
            return 0, f"File not found: {filepath}", {}

        with open(filepath, "rb") as f:
            file_data = f.read()

        fname = os.path.basename(filepath)
        ext = os.path.splitext(fname)[1].lower()
        mime_map = {
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc": "application/msword",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".csv": "text/csv",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".tiff": "image/tiff",
            ".exe": "application/octet-stream",
            ".sh": "application/x-sh",
        }
        mime = mime_map.get(ext, "application/octet-stream")
        boundary = f"----CPABoundary{uuid.uuid4().hex[:8]}"

        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="workspace_id"\r\n\r\n'
            f"{workspace_id}\r\n"
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{fname}"\r\n'
            f"Content-Type: {mime}\r\n\r\n"
        ).encode("utf-8") + file_data + f"\r\n--{boundary}--\r\n".encode("utf-8")

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}"
        }
        return self.request("POST", endpoint, headers=headers, body=body, timeout=timeout)
