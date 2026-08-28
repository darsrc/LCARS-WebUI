"""Derive LCARS form fields from a Pydantic model, and validate submissions.

This module is deliberately free of DSL imports: it only *plans* what a
model-backed form should contain (:func:`plan_model_form`) and later *validates*
what a browser submitted against the same model (:func:`validate_submission`).
``lcars_ui.dsl.api.form`` turns a plan into real widgets through the ordinary
widget functions, and :class:`lcars_ui.application.App` calls the validator on
the submit path.

Only scalar fields are supported. Anything else raises
:class:`UnsupportedFormFieldError` at declaration time rather than silently
rendering a field that could never round-trip.
"""

from __future__ import annotations

import enum
import re
import types
from dataclasses import dataclass
from typing import Any, Literal, Union, get_args, get_origin

from pydantic import BaseModel, ValidationError
from pydantic.fields import FieldInfo
from pydantic_core import PydanticUndefined

FieldKind = Literal["text", "number", "bool", "choice"]
OptionsKey = Literal["options", "settings"]

SUPPORTED_TYPES_SUMMARY = (
    "str, bool, int, float, Enum, Literal, and Optional of those scalars"
)

#: Token used for the "no value" option of an optional choice field.
EMPTY_CHOICE_TOKEN = ""

_TRUE_TOKENS = frozenset({"true", "on", "yes", "1"})
_FALSE_TOKENS = frozenset({"false", "off", "no", "0", ""})

_CONSTRAINT_ATTRIBUTES = (
    "ge",
    "gt",
    "le",
    "lt",
    "min_length",
    "max_length",
    "pattern",
    "multiple_of",
)


class UnsupportedFormFieldError(TypeError):
    """Raised when a model field cannot be rendered as an LCARS control."""


@dataclass(frozen=True)
class ChoicePlan:
    """One option of a generated choice control."""

    token: str
    label: str
    value: Any


@dataclass(frozen=True)
class FieldPlan:
    """What one model field should become, before any widget exists."""

    name: str
    label: str
    description: str | None
    kind: FieldKind
    required: bool
    nullable: bool
    default: Any
    integer: bool = False
    minimum: float | None = None
    maximum: float | None = None
    step: float | None = None
    min_length: int | None = None
    max_length: int | None = None
    pattern: str | None = None
    choices: tuple[ChoicePlan, ...] = ()


@dataclass(frozen=True)
class ModelFormPlan:
    """The full declaration plan for one model-backed form."""

    model: type[BaseModel]
    label: str
    fields: tuple[FieldPlan, ...]


@dataclass(frozen=True)
class ModelFormField:
    """A declared field: enough to coerce a submission and to re-render feedback."""

    name: str
    widget_id: str
    kind: FieldKind
    nullable: bool
    options_key: OptionsKey
    base_options: dict[str, Any]
    choices: tuple[tuple[str, Any], ...] = ()


@dataclass(frozen=True)
class ModelFormBinding:
    """Everything the submit path needs to validate one declared form."""

    model: type[BaseModel]
    form_id: str
    action_id: str
    form_base_options: dict[str, Any]
    fields: tuple[ModelFormField, ...]


@dataclass(frozen=True)
class ModelFormValidation:
    """Outcome of validating one submission against the bound model."""

    model: BaseModel | None
    field_errors: dict[str, str]
    form_errors: tuple[str, ...]

    @property
    def ok(self) -> bool:
        """True when the submission parsed cleanly into a model instance."""
        return self.model is not None


# ---------------------------------------------------------------------------
# Naming
# ---------------------------------------------------------------------------


def humanize(name: str) -> str:
    """Turn ``sensor_range`` / ``SensorRange`` / ``SENSOR`` into ``Sensor Range``."""
    spaced = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", name.replace("_", " ").replace("-", " "))
    words = [word for word in spaced.split() if word]
    if not words:
        return name
    return " ".join(
        word.capitalize() if word.isupper() else word[:1].upper() + word[1:] for word in words
    )


def model_form_label(model: type[BaseModel]) -> str:
    """Use the model's configured title, else a humanised class name."""
    title = model.model_config.get("title")
    if isinstance(title, str) and title:
        return title
    return humanize(model.__name__)


# ---------------------------------------------------------------------------
# Planning
# ---------------------------------------------------------------------------


def _unwrap_union(annotation: Any) -> tuple[list[Any], bool]:
    """Split a possibly-optional annotation into its non-``None`` members."""
    origin = get_origin(annotation)
    if origin is Union or origin is types.UnionType:
        args = list(get_args(annotation))
        members = [arg for arg in args if arg is not type(None)]
        return members, len(members) != len(args)
    return [annotation], False


def choice_token(value: Any) -> str:
    if isinstance(value, enum.Enum):
        return choice_token(value.value)
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _choice_label(value: Any) -> str:
    if isinstance(value, enum.Enum):
        return humanize(value.name)
    if isinstance(value, bool):
        return "On" if value else "Off"
    if isinstance(value, str):
        return humanize(value)
    return str(value)


def _enum_choices(enum_type: type[enum.Enum]) -> tuple[ChoicePlan, ...]:
    return tuple(
        ChoicePlan(
            token=choice_token(member.value),
            label=humanize(member.name),
            value=member.value,
        )
        for member in enum_type
    )


def _literal_choices(members: list[Any]) -> tuple[ChoicePlan, ...]:
    choices: list[ChoicePlan] = []
    seen: set[str] = set()
    for member in members:
        for value in get_args(member):
            token = choice_token(value)
            if token in seen:
                continue
            seen.add(token)
            choices.append(ChoicePlan(token=token, label=_choice_label(value), value=value))
    return tuple(choices)


def _constraints(info: FieldInfo) -> dict[str, Any]:
    """Read ``ge``/``le``/``max_length``/… off whatever metadata pydantic recorded."""
    found: dict[str, Any] = {}
    for item in info.metadata:
        for attribute in _CONSTRAINT_ATTRIBUTES:
            value = getattr(item, attribute, None)
            if value is not None and attribute not in found:
                found[attribute] = value
    return found


def _default_value(info: FieldInfo) -> Any:
    if info.default is not PydanticUndefined:
        return info.default
    factory = info.default_factory
    if factory is None:
        return None
    try:
        return factory()  # type: ignore[call-arg]
    except TypeError:
        return None


def _unsupported(model: type[BaseModel], name: str, annotation: Any) -> UnsupportedFormFieldError:
    rendered = getattr(annotation, "__name__", None) or repr(annotation)
    return UnsupportedFormFieldError(
        f"{model.__name__}.{name}: cannot generate an LCARS control for type {rendered}. "
        f"lcars.form() generates fields for {SUPPORTED_TYPES_SUMMARY}. "
        f"Compose {name!r} yourself with the field-by-field API instead — "
        'declare `with lcars.form("...", action_id=...):` and add the widgets '
        "for that part by hand."
    )


def _numeric_bounds(
    constraints: dict[str, Any],
    *,
    integer: bool,
) -> tuple[float | None, float | None]:
    """Map ``ge``/``gt``/``le``/``lt`` onto the widget's inclusive min/max.

    An exclusive bound has no widget equivalent; integers step inside it, floats
    fall back to the bound itself. Either way the model still enforces the real
    rule server-side, so the widget bound is only a nudge.
    """
    minimum: float | None = None
    maximum: float | None = None
    if "ge" in constraints:
        minimum = float(constraints["ge"])
    elif "gt" in constraints:
        minimum = float(constraints["gt"]) + (1.0 if integer else 0.0)
    if "le" in constraints:
        maximum = float(constraints["le"])
    elif "lt" in constraints:
        maximum = float(constraints["lt"]) - (1.0 if integer else 0.0)
    return minimum, maximum


def _plan_field(model: type[BaseModel], name: str, info: FieldInfo) -> FieldPlan:
    annotation = info.annotation
    members, nullable = _unwrap_union(annotation)
    if not members:
        raise _unsupported(model, name, annotation)

    constraints = _constraints(info)
    label = info.title or humanize(name)
    common: dict[str, Any] = {
        "name": name,
        "label": label,
        "description": info.description,
        "required": info.is_required(),
        "nullable": nullable,
        "default": _default_value(info),
    }

    if all(get_origin(member) is Literal for member in members):
        return FieldPlan(kind="choice", choices=_literal_choices(members), **common)

    if len(members) > 1:
        raise _unsupported(model, name, annotation)

    member = members[0]
    if member is bool:
        return FieldPlan(kind="bool", **common)
    if isinstance(member, type) and issubclass(member, enum.Enum):
        return FieldPlan(kind="choice", choices=_enum_choices(member), **common)
    if member is int or member is float:
        integer = member is int
        minimum, maximum = _numeric_bounds(constraints, integer=integer)
        multiple_of = constraints.get("multiple_of")
        return FieldPlan(
            kind="number",
            integer=integer,
            minimum=minimum,
            maximum=maximum,
            step=float(multiple_of) if multiple_of is not None else (1.0 if integer else None),
            **common,
        )
    if member is str:
        return FieldPlan(
            kind="text",
            min_length=constraints.get("min_length"),
            max_length=constraints.get("max_length"),
            pattern=constraints.get("pattern"),
            **common,
        )
    raise _unsupported(model, name, annotation)


def plan_model_form(model: type[BaseModel]) -> ModelFormPlan:
    """Plan every field of ``model``, raising for anything unrenderable."""
    fields = tuple(_plan_field(model, name, info) for name, info in model.model_fields.items())
    return ModelFormPlan(model=model, label=model_form_label(model), fields=fields)


# ---------------------------------------------------------------------------
# Submission handling
# ---------------------------------------------------------------------------


def _coerce(field: ModelFormField, value: Any) -> Any:
    if field.kind == "bool":
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in _TRUE_TOKENS:
                return True
            if lowered in _FALSE_TOKENS:
                return False
        return value
    if field.kind == "choice":
        lookup = dict(field.choices)
        if isinstance(value, str) and value in lookup:
            return lookup[value]
        token = choice_token(value)
        if token in lookup:
            return lookup[token]
        if value in (None, EMPTY_CHOICE_TOKEN) and field.nullable:
            return None
        return value
    if isinstance(value, str) and value.strip() == "" and field.nullable:
        return None
    return value


def normalize_submission(binding: ModelFormBinding, raw: Any) -> dict[str, Any]:
    """Map a browser (or test) payload onto model field names and python values.

    Keys may be either the generated widget ids or the plain model field names,
    so ``session.submit(form_id, {"mode": "passive"})`` reads naturally in tests
    while the renderer keeps posting fully-qualified widget ids.
    """
    data = raw if isinstance(raw, dict) else {}
    values: dict[str, Any] = {}
    for field in binding.fields:
        if field.widget_id in data:
            values[field.name] = _coerce(field, data[field.widget_id])
        elif field.name in data:
            values[field.name] = _coerce(field, data[field.name])
    return values


def validate_submission(binding: ModelFormBinding, raw: Any) -> ModelFormValidation:
    """Validate one submission, splitting errors into per-field and form-level."""
    form_errors: list[str] = []
    if raw is not None and not isinstance(raw, dict):
        form_errors.append("Submission payload was not a set of field values.")

    values = normalize_submission(binding, raw)
    try:
        instance = binding.model.model_validate(values)
    except ValidationError as exc:
        field_errors: dict[str, str] = {}
        known = {field.name for field in binding.fields}
        for error in exc.errors():
            message = str(error.get("msg") or "Invalid value")
            location = error.get("loc") or ()
            head = location[0] if location else None
            if isinstance(head, str) and head in known:
                field_errors.setdefault(head, message)
            else:
                form_errors.append(message)
        return ModelFormValidation(
            model=None,
            field_errors=field_errors,
            form_errors=tuple(form_errors),
        )
    if form_errors:
        return ModelFormValidation(model=None, field_errors={}, form_errors=tuple(form_errors))
    return ModelFormValidation(model=instance, field_errors={}, form_errors=())


__all__ = [
    "EMPTY_CHOICE_TOKEN",
    "SUPPORTED_TYPES_SUMMARY",
    "ChoicePlan",
    "FieldPlan",
    "ModelFormBinding",
    "ModelFormField",
    "ModelFormPlan",
    "ModelFormValidation",
    "UnsupportedFormFieldError",
    "choice_token",
    "humanize",
    "model_form_label",
    "normalize_submission",
    "plan_model_form",
    "validate_submission",
]
