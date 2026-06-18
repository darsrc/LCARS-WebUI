"""Media and streaming widgets."""

from __future__ import annotations

from typing import Literal

from pydantic import Field, model_validator

from lcars_ui.core.widget_base import BaseWidget, StrictSurfaceVariant, StrictWidgetRole


class LogViewer(BaseWidget):
    """Scrolling terminal-style log viewer."""

    type: Literal["log_viewer"] = "log_viewer"
    stream_id: str = Field(description="Log stream identifier for SSE/WS chunks.")
    max_lines: int = Field(default=1000, ge=1, description="Maximum client-side buffered lines.")
    auto_scroll: bool = Field(
        default=True, description="Follow new lines when already scrolled to the bottom."
    )
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class VideoHls(BaseWidget):
    """HLS video playback widget."""

    type: Literal["video_hls"] = "video_hls"
    src: str = Field(description="URL to an HLS .m3u8 manifest.")
    autoplay: bool = Field(default=False, description="Whether video should autoplay.")
    muted: bool = Field(default=False, description="Whether video should be muted.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class MicButton(BaseWidget):
    """Push-to-talk or continuous (VAD-driven) microphone control."""

    type: Literal["mic_button"] = "mic_button"
    upload_url: str = Field(description="Audio upload endpoint URL.")
    action_id: str = Field(description="Action id emitted after audio processing.")
    timeout_ms: int = Field(
        default=5000,
        ge=100,
        description=(
            "Push-to-talk auto-stop timeout. In continuous mode this instead acts as a "
            "maximum-utterance safety cap: recording is force-stopped and uploaded if "
            "speech continues this long without a silence gap, even if the speaker "
            "hasn't paused."
        ),
    )
    continuous: bool = Field(
        default=False,
        description=(
            "If true, the mic stays open after the first click and auto-detects "
            "speech start/stop via energy-based voice activity detection (VAD), "
            "uploading each utterance automatically with no per-utterance click. "
            "If false (default), behavior is unchanged push-to-talk."
        ),
    )
    silence_ms: int = Field(
        default=900,
        ge=200,
        description=(
            "Continuous mode only: duration of continuous below-threshold silence "
            "required after speech to consider an utterance finished and trigger "
            "upload. Ignored when continuous=False."
        ),
    )
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )

    @model_validator(mode="after")
    def _validate_continuous_timeout(self) -> MicButton:
        if self.continuous and self.timeout_ms < self.silence_ms:
            raise ValueError(
                "timeout_ms must be >= silence_ms when continuous=True "
                "(the max-utterance safety cap cannot be shorter than the silence "
                "gap used to detect end-of-utterance)."
            )
        return self


__all__ = ["LogViewer", "VideoHls", "MicButton"]
