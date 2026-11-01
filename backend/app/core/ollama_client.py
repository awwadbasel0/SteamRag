import time
import json
import hashlib
import asyncio
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.config import settings
from app.api.routes_auth import get_valid_gemini_credentials
from app.db.sqlite_db import cache_get, cache_set


class CloudGeminiClient:
    """
    Cloud-Only LLM Client for SteamRAG Server Edition.
    Exclusively uses live canary-verified Google Gemini Cloud models.
    """

    @staticmethod
    def _is_text_generation_endpoint(short_name: str) -> bool:
        """
        Skips non-text output modalities (TTS audio, image-gen, video-gen, embeddings)
        without hardcoding any Gemini version numbers—every text model is tested via canary probe.
        """
        non_text_modalities = ("tts", "image", "embedding", "imagen", "veo", "lyria", "transcribe", "aqa")
        lower = short_name.lower()
        return not any(mod in lower for mod in non_text_modalities)

    async def fetch_live_gemini_models(self) -> List[Dict[str, Any]]:
        """
        Fetches all text-capable models from Google's API and probes each one with a
        live canary request (strict 3.5s timeout). Only models that respond with valid
        text on the user's tier are returned, sorted by stability and response speed.
        """
        creds = await get_valid_gemini_credentials()
        if not creds:
            return []

        token_hash = hashlib.sha256(creds["token"].encode("utf-8")).hexdigest()[:12]
        cache_key = f"gemini_canary_verified_{token_hash}"
        cached = await cache_get(cache_key)
        if cached is not None:
            return cached

        url = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100"
        headers = {"Content-Type": "application/json"}
        if creds["type"] == "bearer":
            headers["Authorization"] = f"Bearer {creds['token']}"
        else:
            headers["x-goog-api-key"] = creds["token"]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code != 200:
                    return []
                raw_models = res.json().get("models", [])
        except Exception:
            return []

        candidates: List[Dict[str, Any]] = []
        for m in raw_models:
            methods = m.get("supportedGenerationMethods", [])
            if "generateContent" not in methods:
                continue
            short_name = m.get("name", "").replace("models/", "")
            if not self._is_text_generation_endpoint(short_name):
                continue

            display_name = m.get("displayName", short_name)
            candidates.append({
                "name": short_name,
                "display_name": display_name,
                "supports_thinking": bool(m.get("thinking")),
                "modified_at": "cloud",
                "size": 0,
                "digest": f"google-cloud-{short_name}",
                "details": {
                    "family": "gemini",
                    "parameter_size": "Cloud",
                    "input_token_limit": m.get("inputTokenLimit"),
                    "output_token_limit": m.get("outputTokenLimit"),
                },
            })

        if not candidates:
            return []

        # Canary probe each candidate (concurrency=4, strict 3.5s timeout)
        sem = asyncio.Semaphore(4)

        async def run_canary(cand: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            probe_url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand['name']}:generateContent"
            used_zero_budget = False
            gen_cfg: Dict[str, Any] = {"maxOutputTokens": 16}
            if cand.get("supports_thinking"):
                gen_cfg["thinkingConfig"] = {"thinkingBudget": 0}
                used_zero_budget = True

            probe_payload = {
                "contents": [{"role": "user", "parts": [{"text": "ok"}]}],
                "generationConfig": gen_cfg,
            }
            async with sem:
                t0 = time.monotonic()
                try:
                    async with httpx.AsyncClient(timeout=3.5) as client:
                        r = await client.post(probe_url, headers=headers, json=probe_payload)
                        if r.status_code != 200 and cand.get("supports_thinking"):
                            used_zero_budget = False
                            probe_payload["generationConfig"] = {"maxOutputTokens": 128}
                            r = await client.post(probe_url, headers=headers, json=probe_payload)

                        if r.status_code == 200:
                            cands = r.json().get("candidates", [])
                            if cands and cands[0].get("content", {}).get("parts"):
                                latency_ms = int((time.monotonic() - t0) * 1000)
                                cand["latency_ms"] = latency_ms
                                cand["use_thinking_budget_zero"] = used_zero_budget
                                cand["compatibility"] = {
                                    "status": "optimal",
                                    "label": f"☁️ {latency_ms}ms",
                                    "color": "emerald",
                                    "description": f"{cand['display_name']} — Passed live canary ({latency_ms}ms)",
                                    "size_mb": 0,
                                    "runs_on_gpu": True,
                                }
                                return cand
                except Exception:
                    pass
            return None

        verified_results = await asyncio.gather(*[run_canary(c) for c in candidates])
        verified_models = [c for c in verified_results if c is not None]

        def sort_key(item: Dict[str, Any]):
            nm = item["name"]
            is_preview = 1 if ("preview" in nm or "exp" in nm) else 0
            return (is_preview, item.get("latency_ms", 9999))

        verified_models.sort(key=sort_key)

        if verified_models:
            await cache_set(cache_key, verified_models, ttl_seconds=1800)
        return verified_models

    async def list_models(self) -> List[Dict[str, Any]]:
        """Cloud-Only: Returns only live canary-verified Google Gemini cloud models."""
        return await self.fetch_live_gemini_models()

    async def _resolve_target_model(self, requested_model: Optional[str]) -> str:
        """Resolves a valid Gemini model name from requested_model or live verified list."""
        verified = await self.fetch_live_gemini_models()
        if requested_model and any(m["name"] == requested_model for m in verified):
            return requested_model
        if verified:
            return verified[0]["name"]
        return requested_model or "gemini-2.0-flash"

    async def generate_once(self, prompt: str, model: Optional[str] = None) -> str:
        """Fast single-turn completion using Google Gemini Cloud."""
        creds = await get_valid_gemini_credentials()
        if not creds:
            return ""

        target_model = await self._resolve_target_model(model)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent"
        headers = {"Content-Type": "application/json"}
        if creds["type"] == "bearer":
            headers["Authorization"] = f"Bearer {creds['token']}"
        else:
            headers["x-goog-api-key"] = creds["token"]

        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.75,
                "maxOutputTokens": 512,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    candidates = res.json().get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        return "".join(p.get("text", "") for p in parts if not p.get("thought"))
        except Exception:
            pass
        return ""

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Streams completion lines exclusively from Google Gemini Cloud API."""
        creds = await get_valid_gemini_credentials()
        if not creds:
            yield (
                "### 🔑 Connect Google Gemini to Use SteamRAG Server\n\n"
                "No Google account or Gemini API key is configured on this server yet.\n\n"
                "- Click the **Connect Gemini / Settings (⚙️)** button in the top navigation bar.\n"
                "- Paste a **Google AI Studio API Key** or sign in via **Google OAuth 2.0**.\n"
            )
            return

        target_model = await self._resolve_target_model(model)

        system_parts = []
        contents = []
        for m in messages:
            role = m.get("role", "user")
            text = m.get("content", "")
            if not text:
                continue
            if role == "system":
                system_parts.append({"text": text})
            elif role == "assistant":
                contents.append({"role": "model", "parts": [{"text": text}]})
            else:
                contents.append({"role": "user", "parts": [{"text": text}]})

        if not contents:
            contents.append({"role": "user", "parts": [{"text": "Hello"}]})

        headers = {"Content-Type": "application/json"}
        if creds["type"] == "bearer":
            headers["Authorization"] = f"Bearer {creds['token']}"
        else:
            headers["x-goog-api-key"] = creds["token"]

        verified_list = await self.fetch_live_gemini_models()
        verified_meta = {vm["name"]: vm for vm in verified_list}
        fallback_chain = [target_model]
        for vm in verified_list:
            if vm["name"] not in fallback_chain:
                fallback_chain.append(vm["name"])

        def build_model_payload(m_name: str, include_thinking_cfg: bool) -> Dict[str, Any]:
            gen_cfg: Dict[str, Any] = {
                "temperature": 0.35,
                "topP": 0.9,
                "maxOutputTokens": 8192,
            }
            if include_thinking_cfg:
                gen_cfg["thinkingConfig"] = {"thinkingBudget": 0}

            if m_name.lower().startswith("gemma-") and system_parts:
                sys_txt = "\n\n".join(p["text"] for p in system_parts)
                merged_contents = [dict(c) for c in contents]
                first_parts = list(merged_contents[0].get("parts", []))
                first_parts.insert(0, {"text": f"[System Instructions]\n{sys_txt}\n\n"})
                merged_contents[0] = {**merged_contents[0], "parts": first_parts}
                return {"contents": merged_contents, "generationConfig": gen_cfg}

            pl: Dict[str, Any] = {"contents": contents, "generationConfig": gen_cfg}
            if system_parts:
                pl["systemInstruction"] = {"parts": system_parts}
            return pl

        line_buffer = ""
        last_err = ""
        async with httpx.AsyncClient(timeout=120.0) as client:
            for attempt_model in fallback_chain[:4]:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{attempt_model}:streamGenerateContent?alt=sse"
                meta = verified_meta.get(attempt_model, {})
                try_zero = bool(meta.get("use_thinking_budget_zero", False))
                configs_to_try = [True, False] if try_zero else [False]

                for use_zero_cfg in configs_to_try:
                    payload = build_model_payload(attempt_model, use_zero_cfg)
                    async with client.stream("POST", url, headers=headers, json=payload) as response:
                        if response.status_code != 200:
                            err_body = (await response.aread()).decode("utf-8", errors="ignore")
                            last_err = f"({response.status_code}): {err_body[:240]}"
                            if response.status_code == 400 and use_zero_cfg:
                                continue
                            if response.status_code in (429, 503, 404, 400):
                                break
                            yield f"⚠️ **Gemini API Error {last_err}**\n"
                            return

                        async for raw_line in response.aiter_lines():
                            if not raw_line or not raw_line.startswith("data:"):
                                continue
                            data_str = raw_line[5:].strip()
                            if not data_str or data_str == "[DONE]":
                                continue
                            try:
                                chunk = json.loads(data_str)
                                for cand in chunk.get("candidates", []):
                                    for part in cand.get("content", {}).get("parts", []):
                                        if part.get("thought"):
                                            continue
                                        text_piece = part.get("text", "")
                                        if text_piece:
                                            line_buffer += text_piece
                                            while "\n" in line_buffer:
                                                idx = line_buffer.index("\n")
                                                complete_line = line_buffer[: idx + 1]
                                                line_buffer = line_buffer[idx + 1 :]
                                                yield complete_line
                            except json.JSONDecodeError:
                                continue
                        if line_buffer:
                            yield line_buffer
                        return

        yield f"⚠️ **Gemini Quota / Availability Error {last_err}**\n"


ollama_client = CloudGeminiClient()
