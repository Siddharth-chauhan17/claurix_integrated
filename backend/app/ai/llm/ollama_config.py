"""Ollama client wired to claurix Settings (host + model name)."""

from __future__ import annotations

import ollama

from app.config import get_settings


def chat(**kwargs):
    """Drop-in for ollama.chat using configured host and default model."""
    settings = get_settings()
    if "model" not in kwargs:
        kwargs["model"] = settings.ai_model_name
    client = ollama.Client(host=settings.ollama_base_url)
    return client.chat(**kwargs)
