"""kie.ai unified jobs API client (stdlib only).

    POST https://api.kie.ai/api/v1/jobs/createTask   {model, input}
    GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...

Endpoint shapes and the response envelope (code/data.taskId, data.state,
data.resultJson) are taken from a working client in the scroll-craft repo,
so they are known-good rather than guessed.
"""

from __future__ import annotations

import base64
import json
import mimetypes
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.kie.ai"
UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload"

# States reported by recordInfo. Anything not terminal means keep polling.
TERMINAL_OK = {"success"}
TERMINAL_BAD = {"fail", "failed", "error"}


class KieError(RuntimeError):
    """Any non-recoverable failure talking to kie.ai."""


class KieTransient(KieError):
    """A failure worth retrying (5xx, 429, socket error)."""


def load_key(explicit: str | None = None) -> str:
    """API key from argument, environment, or a .env walked up from cwd."""
    if explicit:
        return explicit
    if os.environ.get("KIE_AI_API_KEY"):
        return os.environ["KIE_AI_API_KEY"]
    here = Path.cwd().resolve()
    for folder in [here, *here.parents][:8]:
        env = folder / ".env"
        if not env.exists():
            continue
        for line in env.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.partition("=")
            if sep and key.strip() == "KIE_AI_API_KEY":
                return value.strip().strip("\"'")
    raise KieError("KIE_AI_API_KEY is not set and no .env defines it")


class Kie:
    def __init__(self, key: str | None = None, timeout: int = 120):
        self.key = load_key(key)
        self.timeout = timeout

    # ---------------------------------------------------------- transport --
    def _headers(self) -> dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.key}",
        }

    def _request(self, method: str, url: str, body: dict | None = None) -> dict:
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, headers=self._headers(), method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            detail = err.read().decode("utf-8", "replace")[:500]
            # 429 and 5xx are worth another attempt; 4xx is a real mistake.
            if err.code == 429 or err.code >= 500:
                raise KieTransient(f"{method} {url} -> {err.code}: {detail}") from err
            raise KieError(f"{method} {url} -> {err.code}: {detail}") from err
        except (urllib.error.URLError, TimeoutError, OSError) as err:
            raise KieTransient(f"{method} {url} -> {err}") from err

    def _retrying(self, method: str, url: str, body: dict | None = None, attempts: int = 4) -> dict:
        delay = 2.0
        for attempt in range(1, attempts + 1):
            try:
                return self._request(method, url, body)
            except KieTransient:
                if attempt == attempts:
                    raise
                time.sleep(delay)
                delay *= 2
        raise KieError("unreachable")

    # ------------------------------------------------------------- account --
    def credit(self) -> dict:
        return self._retrying("GET", f"{API}/api/v1/chat/credit").get("data", {})

    # -------------------------------------------------------------- upload --
    def upload(self, path: str | Path, folder: str = "personaswap") -> str:
        """Upload a local file and return its hosted URL.

        kie.ai takes a base64 data URL, so the whole file sits in memory and in
        the request body. Fine for face stills and short clips; a long source
        video should be pre-hosted and passed as an https URL instead.
        """
        p = Path(path).resolve()
        if not p.exists():
            raise KieError(f"file not found: {p}")
        mime = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        payload = base64.b64encode(p.read_bytes()).decode("ascii")
        body = {
            "base64Data": f"data:{mime};base64,{payload}",
            "uploadPath": folder,
            "fileName": p.name,
        }
        out = self._retrying("POST", UPLOAD, body).get("data") or {}
        url = out.get("downloadUrl") or out.get("fileUrl") or out.get("url")
        if not url:
            raise KieError(f"upload of {p.name} returned no URL: {out}")
        return url

    def as_url(self, value: str | Path, folder: str = "personaswap") -> str:
        """Pass an http(s) string through; upload anything else."""
        text = str(value)
        if text.startswith(("http://", "https://")):
            return text
        return self.upload(text, folder)

    # --------------------------------------------------------------- tasks --
    def create_task(self, model: str, payload: dict, callback: str | None = None) -> str:
        body: dict = {"model": model, "input": payload}
        if callback:
            body["callBackUrl"] = callback
        out = self._retrying("POST", f"{API}/api/v1/jobs/createTask", body)
        task_id = (out.get("data") or {}).get("taskId")
        if out.get("code") != 200 or not task_id:
            raise KieError(f"createTask({model}) rejected: {json.dumps(out)[:500]}")
        return task_id

    def peek(self, task_id: str) -> tuple[str, dict]:
        """One status read. Returns (state, data)."""
        query = urllib.parse.urlencode({"taskId": task_id})
        data = self._retrying("GET", f"{API}/api/v1/jobs/recordInfo?{query}").get("data") or {}
        return (data.get("state") or data.get("status") or "waiting"), data

    @staticmethod
    def result_urls(data: dict) -> list[str]:
        raw = data.get("resultJson")
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except json.JSONDecodeError:
                raw = {}
        raw = raw or {}
        return raw.get("resultUrls") or raw.get("result_urls") or raw.get("urls") or []

    def wait(self, task_id: str, timeout_s: int = 1800, on_poll=None) -> list[str]:
        """Poll until the task finishes. Backs off 4s -> 15s."""
        started = time.monotonic()
        delay = 4.0
        while True:
            state, data = self.peek(task_id)
            if state in TERMINAL_OK:
                urls = self.result_urls(data)
                if not urls:
                    raise KieError(f"task {task_id} succeeded with no result URL")
                return urls
            if state in TERMINAL_BAD:
                reason = data.get("failMsg") or data.get("failCode") or json.dumps(data)[:300]
                raise KieError(f"task {task_id} failed: {reason}")
            elapsed = time.monotonic() - started
            if elapsed > timeout_s:
                raise KieError(f"task {task_id} still {state} after {int(elapsed)}s")
            if on_poll:
                on_poll(state, int(elapsed))
            time.sleep(delay)
            delay = min(delay * 1.25, 15.0)

    # ------------------------------------------------------------ download --
    @staticmethod
    def download(url: str, dest: str | Path) -> Path:
        out = Path(dest).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(url, timeout=600) as res, out.open("wb") as fh:
            while chunk := res.read(1 << 20):
                fh.write(chunk)
        return out
