"""Speech-to-text adapters (implemented in Phase 4)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from hashlib import sha256


class STTAdapter(ABC):
    """Abstract speech-to-text adapter contract."""

    @abstractmethod
    def transcribe(self, audio_bytes: bytes) -> str:
        """Return a transcript for raw audio bytes."""


class MockSTTAdapter(STTAdapter):
    """Deterministic CI-safe adapter that hashes input bytes."""

    def transcribe(self, audio_bytes: bytes) -> str:
        digest = sha256(audio_bytes).hexdigest()[:16]
        return f"processed_{digest}"
