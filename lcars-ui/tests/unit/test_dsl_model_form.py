"""Unit tests for model-backed ``ui.form(SomeModel, ...)`` declarations."""

from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

import pytest
from pydantic import BaseModel, Field, model_validator

from lcars_ui import ActionContext, App, ui
from lcars_ui.core.widget_base import BaseWidget
from lcars_ui.widgets.inputs import Form


class SensorMode(str, Enum):
    PASSIVE = "passive"
    ACTIVE = "active"
    STANDBY = "standby"


class ConfigureSensor(BaseModel):
    """Every supported scalar shape, with metadata on each field."""

    designation: str = Field(
        default="Array One",
        description="Operator-facing name for this array.",
        min_length=3,
        max_length=12,
    )
    gain: int = Field(default=4, ge=1, le=10, title="Signal Gain", description="Amplification.")
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    mode: SensorMode = SensorMode.PASSIVE
    band: Literal["narrow", "wide"] = "narrow"
    enabled: bool = True
    offset: float | None = None
    tag: str | None = None

    @model_validator(mode="after")
    def _active_needs_gain(self) -> ConfigureSensor:
        if self.mode is SensorMode.ACTIVE and self.gain < 3:
            raise ValueError("Active mode requires a gain of at least 3")
        return self


def _sensor_app() -> tuple[App, list[ConfigureSensor]]:
    app = App()
    received: list[ConfigureSensor] = []

    @app.page("Sensors", id="sensors")
    def sensors() -> None:
        ui.form(ConfigureSensor, action_id="save-sensor", submit_label="Apply", id="sensor")

    @app.action("save-sensor")
    def save(ctx: ActionContext[ConfigureSensor]) -> None:
        received.append(ctx.value)

    return app, received


def _child(form: BaseWidget, widget_id: str) -> BaseWidget:
    children = getattr(form, "children", [])
    return next(child for child in children if child.id == widget_id)


def test_generated_fields_carry_model_metadata() -> None:
    app, _ = _sensor_app()
    with app.test_client() as client:
        session = client.session()
        form = session.widget("sensor")

        assert isinstance(form, Form)
        # The model's own name becomes the form label; no label argument needed.
        assert form.label == "Configure Sensor"
        assert form.submit_label == "Apply"
        assert form.action_id == "save-sensor"
        assert [child.id for child in form.children] == [
            "sensor-designation",
            "sensor-gain",
            "sensor-threshold",
            "sensor-mode",
            "sensor-band",
            "sensor-enabled",
            "sensor-offset",
            "sensor-tag",
        ]

        designation = _child(form, "sensor-designation")
        assert designation.type == "text_input"
        assert designation.label == "Designation"
        assert designation.value == "Array One"
        assert designation.options is not None
        assert designation.options.description == "Operator-facing name for this array."
        assert designation.options.validation is not None
        assert designation.options.validation.min_length == 3
        assert designation.options.validation.max_length == 12

        gain = _child(form, "sensor-gain")
        assert gain.type == "number_input"
        # field title wins over the humanised field name
        assert gain.label == "Signal Gain"
        assert gain.value == 4.0
        assert (gain.min, gain.max) == (1.0, 10.0)
        assert gain.options is not None
        assert gain.options.description == "Amplification."
        assert gain.options.precision == 0

        threshold = _child(form, "sensor-threshold")
        assert threshold.type == "number_input"
        assert (threshold.min, threshold.max) == (0.0, 1.0)
        assert threshold.options is not None
        assert threshold.options.precision is None

        # LCARS has no dropdown: an Enum renders through the choice control.
        mode = _child(form, "sensor-mode")
        assert mode.type == "select"
        assert [(option.label, option.value) for option in mode.options] == [
            ("Passive", "passive"),
            ("Active", "active"),
            ("Standby", "standby"),
        ]
        assert mode.value == "passive"

        band = _child(form, "sensor-band")
        assert band.type == "select"
        assert [(option.label, option.value) for option in band.options] == [
            ("Narrow", "narrow"),
            ("Wide", "wide"),
        ]

        enabled = _child(form, "sensor-enabled")
        assert enabled.type == "toggle"
        assert enabled.checked is True

        # Optional scalars may be left empty; the choice control gains a null option.
        tag = _child(form, "sensor-tag")
        assert tag.type == "text_input"
        assert tag.options is not None
        assert tag.options.validation is not None
        assert tag.options.validation.required is False


def test_optional_enum_offers_an_empty_option() -> None:
    class Beacon(BaseModel):
        # `typing.Optional` and `X | None` are the same annotation; both work.
        mode: Optional[SensorMode] = None  # noqa: UP045

    app = App()

    @app.page("Beacon", id="beacon")
    def beacon() -> None:
        ui.form(Beacon, action_id="save-beacon", id="beacon-form")

    with app.test_client() as client:
        session = client.session()
        choice = _child(session.widget("beacon-form"), "beacon-form-mode")
        assert [option.value for option in choice.options] == ["", "passive", "active", "standby"]
        assert choice.value == ""


def test_required_field_is_marked_required() -> None:
    class Course(BaseModel):
        heading: str
        speed: int

    app = App()

    @app.page("Helm", id="helm")
    def helm() -> None:
        ui.form(Course, action_id="set-course", id="course")

    with app.test_client() as client:
        session = client.session()
        form = session.widget("course")
        heading = _child(form, "course-heading")
        assert heading.options is not None
        assert heading.options.validation is not None
        assert heading.options.validation.required is True
        speed = _child(form, "course-speed")
        assert speed.options is not None
        assert speed.options.required is True


def test_valid_submission_reaches_the_handler_as_a_model_instance() -> None:
    app, received = _sensor_app()
    with app.test_client() as client:
        session = client.session()
        session.submit(
            "sensor",
            {
                "sensor-designation": "Array Six",
                "sensor-gain": "7",
                "sensor-threshold": "0.25",
                "sensor-mode": "active",
                "sensor-band": "wide",
                "sensor-enabled": False,
                "sensor-offset": "",
                "sensor-tag": "",
            },
        )

        assert len(received) == 1
        parsed = received[0]
        assert isinstance(parsed, ConfigureSensor)
        assert parsed.designation == "Array Six"
        assert parsed.gain == 7
        assert parsed.threshold == 0.25
        assert parsed.mode is SensorMode.ACTIVE
        assert parsed.band == "wide"
        assert parsed.enabled is False
        # An emptied optional scalar comes back as None, not 0.0 or "".
        assert parsed.offset is None
        assert parsed.tag is None


def test_invalid_submission_never_reaches_the_handler_and_flags_fields() -> None:
    app, received = _sensor_app()
    with app.test_client() as client:
        session = client.session()
        session.submit(
            "sensor",
            {
                "sensor-designation": "An Overlong Designation",
                "sensor-gain": "99",
                "sensor-mode": "passive",
            },
        )

        assert received == []
        designation = session.widget("sensor-designation")
        assert designation.options is not None
        assert designation.options.feedback is not None
        assert designation.options.feedback.state == "error"
        assert "at most 12" in designation.options.feedback.message

        gain = session.widget("sensor-gain")
        assert gain.options is not None
        assert gain.options.feedback is not None
        assert gain.options.feedback.state == "error"

        # Fields that validated cleanly are left alone.
        assert session.widget("sensor-mode").settings.feedback is None
        assert session.widget("sensor").options.feedback is None


def test_model_level_error_is_reported_on_the_form() -> None:
    app, received = _sensor_app()
    with app.test_client() as client:
        session = client.session()
        session.submit("sensor", {"sensor-gain": "1", "sensor-mode": "active"})

        assert received == []
        form_feedback = session.widget("sensor").options.feedback
        assert form_feedback is not None
        assert form_feedback.state == "error"
        assert "gain of at least 3" in form_feedback.message
        # A cross-field rule belongs to the form, not to one field.
        assert session.widget("sensor-gain").options.feedback is None


def test_a_later_valid_submission_clears_the_previous_errors() -> None:
    app, received = _sensor_app()
    with app.test_client() as client:
        session = client.session()
        session.submit("sensor", {"sensor-gain": "99"})
        assert session.widget("sensor-gain").options.feedback is not None

        session.submit("sensor", {"sensor-gain": "6"})
        assert session.widget("sensor-gain").options.feedback is None
        assert len(received) == 1


def test_choice_field_rejects_a_value_outside_the_model() -> None:
    app, received = _sensor_app()
    with app.test_client() as client:
        session = client.session()
        session.submit("sensor", {"sensor-mode": "tachyon"})

        assert received == []
        # A select carries its capabilities on `settings`, not `options`.
        feedback = session.widget("sensor-mode").settings.feedback
        assert feedback is not None
        assert feedback.state == "error"


def test_constraints_are_enforced_server_side_not_only_rendered() -> None:
    """A payload that ignores the rendered bounds is still rejected."""
    app, received = _sensor_app()
    with app.test_client() as client:
        session = client.session()

        # The widget advertises min=1/max=10; the model is what actually decides.
        session.submit("sensor", {"sensor-gain": 40})
        assert received == []
        assert session.widget("sensor-gain").options.feedback is not None

        session.submit("sensor", {"sensor-gain": 0})
        assert received == []

        session.submit("sensor", {"sensor-gain": 10})
        assert [item.gain for item in received] == [10]


def test_missing_required_field_is_reported_on_that_field() -> None:
    class Course(BaseModel):
        heading: str

    app = App()
    received: list[Course] = []

    @app.page("Helm", id="helm")
    def helm() -> None:
        ui.form(Course, action_id="set-course", id="course")

    @app.action("set-course")
    def set_course(ctx: ActionContext[Course]) -> None:
        received.append(ctx.value)

    with app.test_client() as client:
        session = client.session()
        session.submit("course", {})

        assert received == []
        feedback = session.widget("course-heading").options.feedback
        assert feedback is not None
        assert "required" in feedback.message.lower()


def test_form_reports_errors_even_without_a_registered_handler() -> None:
    class Course(BaseModel):
        speed: int = Field(ge=1, le=9)

    app = App()

    @app.page("Helm", id="helm")
    def helm() -> None:
        ui.form(Course, action_id="set-course", id="course")

    with app.test_client() as client:
        session = client.session()
        session.submit("course", {"course-speed": 99})
        assert session.widget("course-speed").options.feedback is not None


@pytest.mark.parametrize(
    ("annotation", "rendered"),
    [
        (list[str], "list"),
        (dict[str, int], "dict"),
    ],
)
def test_unsupported_scalar_containers_raise_at_declaration_time(
    annotation: object,
    rendered: str,
) -> None:
    model = type(
        "Payload",
        (BaseModel,),
        {"__annotations__": {"cargo": annotation}},
    )

    app = App()

    @app.page("Cargo", id="cargo")
    def cargo() -> None:
        ui.form(model, action_id="stow", id="cargo-form")

    with pytest.raises(TypeError) as excinfo:
        app.build_manifest()

    message = str(excinfo.value)
    assert "Payload.cargo" in message
    assert rendered in message
    assert "field-by-field" in message


def test_nested_model_field_raises_at_declaration_time() -> None:
    class Coordinates(BaseModel):
        x: float
        y: float

    class Waypoint(BaseModel):
        name: str
        position: Coordinates

    app = App()

    @app.page("Nav", id="nav")
    def nav() -> None:
        ui.form(Waypoint, action_id="plot", id="waypoint")

    with pytest.raises(TypeError) as excinfo:
        app.build_manifest()

    message = str(excinfo.value)
    assert "Waypoint.position" in message
    assert "Coordinates" in message
    assert "field-by-field" in message


def test_mixed_scalar_union_raises_at_declaration_time() -> None:
    class Reading(BaseModel):
        magnitude: int | str

    app = App()

    @app.page("Scan", id="scan")
    def scan() -> None:
        ui.form(Reading, action_id="record", id="reading")

    with pytest.raises(TypeError) as excinfo:
        app.build_manifest()

    assert "Reading.magnitude" in str(excinfo.value)


def test_model_form_round_trip_through_the_test_client() -> None:
    """Declare, submit valid, submit invalid — all through the public API."""
    app, received = _sensor_app()

    with app.test_client() as client:
        session = client.session()

        assert "sensors" in session.pages
        assert session.widget("sensor").type == "form"

        valid = session.submit(
            "sensor",
            {"designation": "Array Two", "gain": 8, "mode": "active", "band": "wide"},
        )
        assert [effect.type for effect in valid] == ["action_ack"]
        assert [item.designation for item in received] == ["Array Two"]
        assert received[0].mode is SensorMode.ACTIVE

        invalid = session.submit("sensor", {"designation": "No", "gain": 8})
        assert "widget_update" in [effect.type for effect in invalid]
        assert len(received) == 1
        assert session.widget("sensor-designation").options.feedback is not None
