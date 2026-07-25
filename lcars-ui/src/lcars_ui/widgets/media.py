"""Media and streaming widgets."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import Field, model_validator

from lcars_ui.core.assets import validate_asset_path
from lcars_ui.core.widget_base import BaseWidget, StrictSurfaceVariant, StrictWidgetRole
from lcars_ui.widgets.options import LogOptions, MicOptions, ThreeSceneOptions, VideoOptions


class LogViewer(BaseWidget):
    """Scrolling terminal-style log viewer."""

    type: Literal["log_viewer"] = "log_viewer"
    stream_id: str = Field(description="Log stream identifier for SSE/WS chunks.")
    max_lines: int = Field(default=1000, ge=1, description="Maximum client-side buffered lines.")
    auto_scroll: bool = Field(
        default=True, description="Follow new lines when already scrolled to the bottom."
    )
    options: LogOptions | None = Field(default=None, description="Enhanced log capabilities.")
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
    options: VideoOptions | None = Field(default=None, description="Enhanced video capabilities.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class ThreeScene(BaseWidget):
    """A library-managed Three.js viewport configured by a project scene module.

    This is the one widget whose behaviour is written in JavaScript rather than
    Python: real 3D needs geometry construction, loaders and imports, which do
    not survive being passed through the manifest as a source string the way
    ``Shader``'s GLSL does. The module is ordinary same-origin project code —
    trusted, not sandboxed — and the renderer owns everything around it: canvas,
    camera, controls, resizing, the frame loop and disposal.
    """

    type: Literal["three_scene"] = "three_scene"
    module: str = Field(
        description=(
            "Scene module path relative to the app's assets directory, e.g. "
            "'scenes/warp_core.js'. Served from /lcars/assets/."
        )
    )
    props: dict[str, Any] = Field(
        default_factory=dict,
        description="JSON-serializable data handed to the scene module's setup().",
    )
    aspect_ratio: float | None = Field(
        default=None, gt=0, description="Optional width/height ratio for the viewport."
    )
    options: ThreeSceneOptions | None = Field(default=None, description="Scene capabilities.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )

    @model_validator(mode="after")
    def _validate_module_path(self) -> ThreeScene:
        self.module = validate_asset_path(self.module, extensions=(".js", ".mjs"))
        return self


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
    options: MicOptions | None = Field(
        default=None, description="Enhanced microphone capabilities."
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


__all__ = ["LogViewer", "VideoHls", "ThreeScene", "MicButton"]
