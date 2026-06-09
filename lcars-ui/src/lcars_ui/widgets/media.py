"""Media and streaming widgets."""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from lcars_ui.core.widget_base import BaseWidget, StrictSurfaceVariant, StrictWidgetRole


class LogViewer(BaseWidget):
    """Scrolling terminal-style log viewer."""

    type: Literal["log_viewer"] = "log_viewer"
    stream_id: str = Field(description="Log stream identifier for SSE/WS chunks.")
    max_lines: int = Field(default=1000, ge=1, description="Maximum client-side buffered lines.")
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
    """Push-to-talk microphone control."""

    type: Literal["mic_button"] = "mic_button"
    upload_url: str = Field(description="Audio upload endpoint URL.")
    action_id: str = Field(description="Action id emitted after audio processing.")
    timeout_ms: int = Field(default=5000, ge=100, description="Auto-stop recording timeout.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


__all__ = ["LogViewer", "VideoHls", "MicButton"]
