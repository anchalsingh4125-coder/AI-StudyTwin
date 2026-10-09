import os
import json
import logging
import httpx
from typing import Optional
from models.diagnosis_schemas import DiagnosisRequest, DiagnosisResponse
from prompts.diagnosis_prompt import SYSTEM_PROMPT, build_diagnosis_prompt
from .fallback_diagnosis import generate_fallback_diagnosis

logger = logging.getLogger("ai_service.llm")

class LLMDiagnosisService:
    def __init__(self):
        self.api_key = os.getenv("LLM_API_KEY", "").strip()
        self.model = os.getenv("LLM_MODEL", "gemini-1.5-flash").strip()
        self.base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").strip()
        self.timeout = float(os.getenv("LLM_TIMEOUT", "10.0"))

    async def diagnose_student(self, request: DiagnosisRequest) -> DiagnosisResponse:
        """
        Diagnose student cognitive state using LLM or fallback engine.
        Guarantees a valid DiagnosisResponse is always returned.
        """
        if not self.api_key:
            logger.info("[LLM Service] LLM_API_KEY is not configured. Utilizing deterministic diagnosis fallback.")
            return generate_fallback_diagnosis(request)

        try:
            prompt = build_diagnosis_prompt(request)
            raw_response_text = await self._call_llm_api(prompt)

            # Strip markdown code blocks if the LLM wrapped response in ```json ... ```
            cleaned_text = raw_response_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()

            parsed_data = json.loads(cleaned_text)
            validated_response = DiagnosisResponse.model_validate(parsed_data)
            logger.info("[LLM Service] Successfully generated validated diagnosis via LLM.")
            return validated_response

        except Exception as error:
            logger.warning(
                f"[LLM Service Warning] LLM invocation failed ({type(error).__name__}: {error}). "
                "Engaging deterministic fallback diagnosis."
            )
            return generate_fallback_diagnosis(request)

    async def _call_llm_api(self, prompt: str) -> str:
        """
        Invoke the external LLM provider using OpenAI-compatible or Google Gemini endpoint.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # Check if Google Gemini direct API format is configured
        if "generativelanguage.googleapis.com" in self.base_url:
            url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
            payload = {
                "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\n{prompt}"}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]

        # Default: OpenAI-compatible chat completion format
        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(endpoint, json=payload, headers=headers)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]

llm_service = LLMDiagnosisService()
