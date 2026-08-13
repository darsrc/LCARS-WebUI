"""Code-rendered recreations of selected ``LCARS_TRUTH`` frames.

Every screen in this example is declared through the public ``lcars_ui`` DSL and
rendered by the normal LCARS WebUI frontend. Select a screen with
``LCARS_CANON_DESIGN``: ``seismic``, ``periodic``, ``holodeck``, or ``access``.

No reference image is served to or loaded by the application.
"""

from __future__ import annotations

import math
import os

import lcars_ui as lcars

DESIGN = os.getenv("LCARS_CANON_DESIGN", "seismic").lower()

SEISMIC_SIGNAL = [
    round(
        math.sin(index * 0.46)
        * (
            9
            + 68 * math.exp(-(((index - 10) / 5.0) ** 2))
            + 43 * math.exp(-(((index - 29) / 3.1) ** 2))
            + 86 * math.exp(-(((index - 58) / 7.0) ** 2))
            + 51 * math.exp(-(((index - 79) / 3.5) ** 2))
            + 38 * math.exp(-(((index - 96) / 2.8) ** 2))
        ),
        2,
    )
    for index in range(108)
]

SEISMIC_ROWS = [
    {"LCARS": "1213", "GRID": "64759551", "VECTOR": "9840", "LOCK": "7073"},
    {"LCARS": "8990", "GRID": "33571516", "VECTOR": "7107", "LOCK": "9523"},
    {"LCARS": "1450", "GRID": "7980936", "VECTOR": "2984", "LOCK": "1253"},
    {"LCARS": "2557", "GRID": "78251596", "VECTOR": "876", "LOCK": "4742"},
    {"LCARS": "1037", "GRID": "81639406", "VECTOR": "8481", "LOCK": "7372"},
    {"LCARS": "1041", "GRID": "87557455", "VECTOR": "9811", "LOCK": "422"},
]

PERIODIC_X = [109, 232, 357, 481, 613, 740, 867, 992, 1123, 1251]
PERIODIC_COLORS = {
    "orange": "#de9437",
    "bright": "#f29012",
    "lilac": "#aa93cb",
    "pale-lilac": "#ceace3",
    "blue": "#a0a0e4",
    "salmon": "#fcae5c",
    "canary": "#fdf3a1",
    "rust": "#d57b3c",
}

# (column, y, symbol, name, atomic weight, sampled color role). The sparse topology
# is data: it must not be inferred or back-filled by the adaptive compositor.
PERIODIC_ELEMENTS = [
    (1, 238, "H", "HYDROGEN", "01", "orange"),
    (9, 238, "Rx", "MAXIUM", "132", "orange"),
    (10, 238, "Es", "ESTIMONIUM", "84", "salmon"),
    (1, 295, "Li", "LITHIUM", "03", "lilac"),
    (2, 295, "Be", "BERYLLIUM", "04", "lilac"),
    (8, 295, "Rx", "MAVALIUM", "92", "orange"),
    (9, 295, "Br", "BEGONIUM", "164", "orange"),
    (10, 295, "Po", "POL", "230", "orange"),
    (1, 353, "Na", "SODIUM", "11", "bright"),
    (2, 353, "Mg", "MAGNESIUM", "12", "orange"),
    (8, 353, "Bn", "BOBRONIUM", "184", "bright"),
    (9, 353, "Fr", "FREMONIA", "22", "bright"),
    (1, 412, "K", "SODIUM", "18", "bright"),
    (2, 412, "Ca", "CALFORIUM", "19", "orange"),
    (3, 412, "Es", "EXODIUM", "84", "orange"),
    (4, 412, "La", "STOGELLA", "18", "lilac"),
    (5, 412, "Pa", "PARIUM", "23", "orange"),
    (6, 412, "Sn", "SORADON", "59", "salmon"),
    (7, 412, "Ra", "JUBERNIUM", "89", "orange"),
    (8, 412, "Fr", "FREMONIA", "92", "orange"),
    (9, 412, "Ed", "CHAWCIUM", "68", "orange"),
    (10, 412, "Mi", "PLUTONIUM", "55", "blue"),
    (1, 473, "Rh", "RHODIUM", "27", "pale-lilac"),
    (2, 473, "Cs", "COSIUM", "37", "orange"),
    (3, 473, "Po", "PII", "230", "lilac"),
    (4, 473, "Mo", "STOGELLA", "10", "orange"),
    (5, 473, "Qu", "ATOMICUM", "73", "orange"),
    (6, 473, "Qk", "QUARK", "17", "salmon"),
    (7, 473, "Mx", "MARD", "98", "canary"),
    (8, 473, "Ed", "CHAWCIUM", "68", "salmon"),
    (9, 473, "Sw", "SWABIUM", "87", "blue"),
    (10, 473, "An", "NEANDROMIUM", "16", "blue"),
    (1, 528, "Cs", "MYCEER", "01", "lilac"),
    (2, 528, "Bz", "BARZIUM", "63", "orange"),
    (3, 528, "Kr", "KRYPTON", "01", "lilac"),
    (4, 528, "Cr", "CROY", "10", "orange"),
    (5, 528, "Rj", "JAMESIUM", "123", "salmon"),
    (6, 528, "Ri", "CRYATIUM", "82", "bright"),
    (7, 528, "Mr", "GROUCH", "22", "canary"),
    (8, 528, "Ke", "KETHRON", "22", "pale-lilac"),
    (9, 528, "Co", "CLARITE", "68", "blue"),
    (10, 528, "Fx", "CHRONISER", "56", "lilac"),
    (1, 587, "Fr", "FRANCIUM", "87", "lilac"),
    (2, 587, "Mx", "GERANIUM", "87", "bright"),
    (3, 587, "Dt", "DURANIUM", "87", "bright"),
    (4, 587, "Di", "PERMESIUM", "77", "bright"),
    (5, 587, "Hg", "RELSIUM", "82", "orange"),
    (6, 587, "Wc", "FREDIUM", "100", "salmon"),
    (7, 587, "Mx", "ZIPP", "87", "bright"),
    (8, 587, "Ca", "HODESS", "01", "canary"),
    (9, 587, "Ch", "JOCOMIUM", "87", "blue"),
    (10, 587, "Ma", "ATOMIUM", "87", "lilac"),
    (1, 645, "Ac", "ANDELIUM", "108", "bright"),
    (2, 645, "Br", "VAGNIUM", "39", "orange"),
    (3, 645, "Tm", "PURESOMITE", "66", "rust"),
    (4, 645, "St", "TAGIUM", "77", "rust"),
    (5, 645, "Wc", "FREDIUM", "100", "salmon"),
    (6, 645, "Al", "SMYTIUM", "66", "bright"),
    (7, 645, "Ar", "DETRIUM", "87", "rust"),
    (8, 645, "Br", "BROMATIUM", "87", "rust"),
    (9, 645, "Tx", "ARVATIUIM", "55", "bright"),
    (1, 710, "Ab", "GRIB", "55", "blue"),
    (9, 710, "Sn", "FUTURE", "63", "rust"),
    (10, 710, "Bi", "THYMPERIUM", "55", "rust"),
    (3, 769, "Cd", "METESIUM", "183", "orange"),
    (4, 769, "Dy", "DUBNIUM", "87", "pale-lilac"),
    (5, 769, "Bu", "RHEGSIUM", "120", "pale-lilac"),
    (6, 769, "Da", "LAFFQUERIUM", "87", "pale-lilac"),
    (7, 769, "Wy", "DRYAPUM", "156", "bright"),
    (8, 769, "Da", "BLECKSIER", "139", "lilac"),
    (9, 769, "Sy", "SEFFERISCAT", "55", "rust"),
    (10, 769, "Ef", "FAMKET", "87", "bright"),
    (4, 835, "Py", "MERCY", "87", "bright"),
    (5, 835, "Mx", "ZEPI", "87", "pale-lilac"),
    (6, 835, "Md", "RENMET", "87", "pale-lilac"),
]

HOLODECK_ROWS = [
    {"SEQ": "2300", "GRP": "07", "INDEX": "09456790", "VECTOR": "08564242", "STATE": "687655"},
    {"SEQ": "8670", "GRP": "31", "INDEX": "46567736", "VECTOR": "35476580", "STATE": "802647"},
    {"SEQ": "8660", "GRP": "42", "INDEX": "6797745", "VECTOR": "736586", "STATE": "270648"},
    {"SEQ": "8975", "GRP": "82", "INDEX": "36667773", "VECTOR": "36476580", "STATE": "868745"},
    {"SEQ": "75", "GRP": "—", "INDEX": "3645", "VECTOR": "3583", "STATE": "692"},
    {"SEQ": "2770", "GRP": "06", "INDEX": "67367685", "VECTOR": "09865677", "STATE": "868237"},
    {"SEQ": "2700", "GRP": "08", "INDEX": "68348750", "VECTOR": "89676579", "STATE": "697567"},
    {"SEQ": "8500", "GRP": "00", "INDEX": "09438750", "VECTOR": "76579", "STATE": "697687"},
]

ACCESS_METERS = [
    ("08", "334", "lilac", 34),
    ("90", "", "blue-bell", 90),
    ("78", "139", "orange", 78),
    ("67", "", "orange", 67),
    ("89", "979", "chestnut-rose", 89),
    ("77", "767", "chestnut-rose", 77),
    ("01", "999", "blue-bell", 14),
    ("54", "999", "golden-tanoi", 54),
]


def _seismic_ui() -> None:
    lcars.config(
        "Penthara IV Seismic Activity Monitor",
        subtitle="LCARS 416176",
        theme="nemesis",
        header_color="pale-canary",
        settings_page=False,
    )
    lcars.nav(
        "Sensor Array",
        page="screen",
        color="pale-canary",
        segments=[
            {"label": "02-4171065", "color": "lilac"},
            {"label": "03-7835565", "color": "atomic-tangerine"},
            {"label": "04-4755260", "color": "golden-tanoi"},
            {"label": "05-4788265", "color": "atomic-tangerine"},
        ],
    )
    with lcars.page(
        "Planetary Sensor Array On Line", id="screen", layout="telemetry", fillers=False
    ):
        with lcars.sweep(
            "Seismic Activity Scope",
            subtitle="22,000—35,000",
            color="anakiwa",
            reverse=True,
            width_sidebar=120,
            left_width=0.76,
            zone="primary",
            span=(5, 4),
            weight=12,
            id="seismic-scope",
        ) as scope:
            with scope.header():
                lcars.text(
                    "PENTHARA IV / SEISMIC EVENT TRACKING",
                    size="h2",
                    color="pale-canary",
                    id="seismic-caption",
                )
            with scope.column_inputs():
                lcars.metric("GRID", "01-4501765", color="atomic-tangerine", id="seismic-grid")
                lcars.metric("LOCK", "04-4755260", status="warn", id="seismic-lock")
                lcars.metric("CHANNEL", "05-4788265", color="lilac", id="seismic-channel")
            with scope.left():
                lcars.chart(
                    SEISMIC_SIGNAL,
                    title="TECTONIC AMPLITUDE / PLANETARY TIME INDEX",
                    color="lilac",
                    options=lcars.ChartOptions(
                        legend=False,
                        tooltip=False,
                        curve="linear",
                        x_axis=lcars.AxisOptions(show=True, label="22,000—35,000"),
                        y_axis=lcars.AxisOptions(show=True, label="AMPLITUDE", min=-110, max=110),
                        reference_lines=[
                            lcars.ReferenceLine(value=0, label="0.0", color="golden-tanoi")
                        ],
                    ),
                    id="seismic-waveform",
                )
            with scope.right():
                lcars.table(
                    SEISMIC_ROWS, title="EVENT MATRIX", color="pale-canary", id="seismic-matrix"
                )


def _periodic_ui() -> None:
    lcars.config(
        "Table of Elements 99823",
        subtitle="Starfleet Educational Materials",
        theme="tng",
        header_color="orange",
        settings_page=False,
    )
    with lcars.page(
        "Table of Elements 99823",
        id="screen",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        element_rects = [
            (PERIODIC_X[column - 1], y, PERIODIC_X[column - 1] + 119, y + 51)
            for column, y, *_ in PERIODIC_ELEMENTS
        ]
        structural_rects = [
            (9, 7, 76, 89),
            (80, 7, 826, 89),
            (845, 7, 1385, 89),
            (1403, 7, 1470, 89),
            (110, 222, 227, 232),
            (1118, 222, 1369, 232),
            (358, 392, 598, 403),
            (613, 392, 730, 403),
            (740, 392, 854, 403),
            (870, 392, 986, 403),
            (362, 745, 1108, 756),
            (112, 822, 330, 884),
            (9, 993, 76, 1075),
            (96, 991, 1383, 1073),
            (1403, 993, 1471, 1075),
        ]
        rects = [*element_rects, *structural_rects]
        x_points = sorted({0, 1476, *(point for x1, _, x2, _ in rects for point in (x1, x2))})
        y_points = sorted({0, 1080, *(point for _, y1, _, y2 in rects for point in (y1, y2))})
        columns = [
            f"{end - start}fr" for start, end in zip(x_points, x_points[1:], strict=False)
        ]
        rows = [
            f"{end - start}fr" for start, end in zip(y_points, y_points[1:], strict=False)
        ]

        def placement(rect: tuple[int, int, int, int]) -> dict[str, int]:
            x1, y1, x2, y2 = rect
            column = x_points.index(x1) + 1
            row = y_points.index(y1) + 1
            return {
                "column": column,
                "row": row,
                "column_span": x_points.index(x2) - column + 1,
                "row_span": y_points.index(y2) - row + 1,
            }

        with lcars.composition(
            columns=columns,
            rows=rows,
            design_size=(1476, 1080),
            min_width=960,
            narrow="scroll",
            id="periodic-composition",
        ) as composition:
            with composition.area(
                "periodic-top-cap-left",
                **placement((9, 7, 76, 89)),
                decorative=True,
            ):
                lcars.bar(color="#f29012", caps="start", thickness=82, id="periodic-top-left")
            with composition.area("periodic-title", **placement((80, 7, 826, 89))):
                lcars.text(
                    "TABLE OF ELEMENTS 99823",
                    size="display",
                    color="#f29012",
                    id="periodic-title-text",
                )
            with composition.area(
                "periodic-top-bar",
                **placement((845, 7, 1385, 89)),
                decorative=True,
            ):
                lcars.bar(color="#f29012", thickness=82, id="periodic-top-center")
            with composition.area(
                "periodic-top-cap-right",
                **placement((1403, 7, 1470, 89)),
                decorative=True,
            ):
                lcars.bar(color="#f29012", caps="end", thickness=82, id="periodic-top-right")

            group_bars = [
                ("hydrogen-series", None, (110, 222, 227, 232), "#ca97fd"),
                ("transsonic-series", "TRANSSONIC SERIES", (1118, 222, 1369, 232), "#ca97fd"),
                ("hypersonic-series", "HYPERSONIC SERIES", (358, 392, 598, 403), "#ca97fd"),
                ("gamma-series", "GAMMA SERIES", (613, 392, 730, 403), "#f29012"),
                ("omega-series", "OMEGA SERIES", (740, 392, 854, 403), "#f29012"),
                ("world-series", "WORLD SERIES", (870, 392, 986, 403), "#ca97fd"),
                ("mega-series", "MEGA SERIES", (362, 745, 1108, 756), "#ca97fd"),
            ]
            for area_id, label, rect, color in group_bars:
                with composition.area(area_id, **placement(rect), decorative=True):
                    lcars.bar(
                        label,
                        color=color,
                        label_mode="cutout" if label else "embedded",
                        align="center",
                        thickness=rect[3] - rect[1],
                        id=f"{area_id}-bar",
                    )

            for index, (column, y, symbol, name, atomic_weight, color_role) in enumerate(
                PERIODIC_ELEMENTS
            ):
                rect = (PERIODIC_X[column - 1], y, PERIODIC_X[column - 1] + 119, y + 51)
                with composition.area(f"element-area-{index:02d}", **placement(rect)):
                    lcars.button(
                        name,
                        color=PERIODIC_COLORS[color_role],
                        id=f"element-{index:02d}",
                        presentation="data_tile",
                        symbol=symbol,
                        detail=f"ATM WT {atomic_weight}",
                        glyph=lcars.AtomGlyph(
                            rings=1 + min(5, index // 13),
                            electrons=min(24, 1 + index // 2),
                            spokes=min(16, index // 6),
                            rotation=(index * 29) % 360,
                        ),
                        density="micro",
                    )

            with composition.area("periodic-caption", **placement((112, 822, 330, 884))):
                lcars.text(
                    "THIS TABLE LISTS THOSE ELEMENTS UTILISED BY THE\n"
                    "STANDARDIZED TEXTS OF THE STARFLEET EDUCATIONAL\n"
                    "TEXTS. OTHER CHARTS ARE AVAILABLE BY ACCESSING\n"
                    "MATERIAL UNDER THE HEADING ‘NEAT STUFF’.",
                    size="micro",
                    color="#ca97fd",
                    id="periodic-caption-text",
                )

            with composition.area(
                "periodic-bottom-cap-left",
                **placement((9, 993, 76, 1075)),
                decorative=True,
            ):
                lcars.bar(color="#f29012", caps="start", thickness=82, id="periodic-bottom-left")
            with composition.area(
                "periodic-bottom-bar",
                **placement((96, 991, 1383, 1073)),
                decorative=True,
            ):
                lcars.bar(color="#f29012", thickness=82, id="periodic-bottom-center")
            with composition.area(
                "periodic-bottom-cap-right",
                **placement((1403, 993, 1471, 1075)),
                decorative=True,
            ):
                lcars.bar(color="#f29012", caps="end", thickness=82, id="periodic-bottom-right")


def _holodeck_ui() -> None:
    lcars.config(
        "Holodeck Programming",
        subtitle="LCARS Simulation Index",
        theme="nemesis",
        header_color="atomic-tangerine",
        settings_page=False,
    )
    lcars.nav(
        "Program Select",
        page="screen",
        color="atomic-tangerine",
        segments=[
            {"label": "20", "color": "lilac"},
            {"label": "451", "color": "atomic-tangerine"},
            {"label": "947", "color": "lilac"},
            {"label": "88", "color": "golden-tanoi"},
        ],
    )
    with lcars.page("Holodeck Programming", id="screen", layout="console", fillers=False):
        with lcars.sweep(
            "LCARS Simulation Matrix",
            subtitle="20 · 451 · 947 · 88",
            color="atomic-tangerine",
            reverse=False,
            width_sidebar=150,
            left_width=0.78,
            zone="primary",
            span=(6, 4),
            weight=12,
            id="holodeck-matrix",
        ) as panel:
            with panel.column_inputs():
                for index, (label, color) in enumerate(
                    [
                        ("SS WCT", "golden-tanoi"),
                        ("RK RS", "atomic-tangerine"),
                        ("RK BER", "lilac"),
                        ("E AEI", "golden-tanoi"),
                        ("B AMS", "lilac"),
                        ("M ET", "golden-tanoi"),
                    ]
                ):
                    lcars.button(label, color=color, id=f"holo-rail-{index}")
                for index, (label, color) in enumerate(
                    [
                        ("W GBG", "atomic-tangerine"),
                        ("LV BRT", "golden-tanoi"),
                        ("W WTN", "lilac"),
                        ("EZ TW", "atomic-tangerine"),
                        ("JE DC", "atomic-tangerine"),
                    ]
                ):
                    lcars.button(label, color=color, id=f"holo-right-{index}")
            with panel.left():
                lcars.table(
                    HOLODECK_ROWS,
                    title="PROGRAM VECTOR BANK",
                    color="atomic-tangerine",
                    id="holodeck-table",
                )
                lcars.text(
                    "SIMULATION PERSONNEL INDEX",
                    size="h2",
                    color="lilac",
                    id="holodeck-index-label",
                )
                with lcars.bracket(color="lilac", orientation="both", id="holodeck-choices"):
                    lcars.radio_toggle(
                        "PROGRAM SET 451-A",
                        ["MR SRT", "JL NIC", "BN SPN"],
                        color="atomic-tangerine",
                        id="holo-choice-a",
                    )
                    lcars.radio_toggle(
                        "PROGRAM SET 947-B",
                        ["GZ KR", "GN RBY", "DG DXR"],
                        color="lilac",
                        id="holo-choice-b",
                    )
                    lcars.radio_toggle(
                        "PROGRAM SET 88-C",
                        ["M OKA", "MK DRN", "NL TRE"],
                        color="golden-tanoi",
                        id="holo-choice-c",
                    )
                lcars.radio_toggle(
                    "SIMULATION ASSIGNMENT INDEX",
                    ["W GBG", "LV BRT", "W WTN", "EZ TW", "JE DC"],
                    color="atomic-tangerine",
                    id="holodeck-assignment-index",
                )


def _access_ui() -> None:
    lcars.config(
        "LCARS Computer Access 54 ADGE",
        subtitle="Offline Authorization Channel",
        theme="tng",
        header_color="lilac",
        settings_page=False,
    )
    lcars.nav(
        "Systems",
        page="screen",
        color="golden-tanoi",
        segments=[
            {"label": "COMM", "color": "blue-bell"},
            {"label": "MODE SELECT", "color": "lilac"},
            {"label": "LCARS 2005", "color": "chestnut-rose"},
        ],
    )
    with lcars.page("Audio-Visual Interface Ready", id="screen", layout="console", fillers=False):
        with lcars.sweep(
            "Interface Status Matrix",
            subtitle="Console 54 ADGE",
            color="chestnut-rose",
            reverse=False,
            width_sidebar=150,
            left_width=0.35,
            zone="primary",
            span=(6, 4),
            weight=12,
            id="access-console",
        ) as panel:
            with panel.column_inputs():
                statuses = [
                    ("Audio-Visual Interface Ready", "READY", "lilac"),
                    ("User Input Pathways Defined", "DEFINED", "golden-tanoi"),
                    ("Universal Translator Online", "ONLINE", "blue-bell"),
                    ("Subspace Communications Channel Open", "OPEN", "lilac"),
                    ("Bio-Neural Circuitry Operational", "OPERATIONAL", "orange"),
                    ("LCARS Library", "ACCESS", "chestnut-rose"),
                    ("Authorization", "55", "golden-tanoi"),
                ]
                for index, (label, value, color) in enumerate(statuses):
                    lcars.metric(label, value, color=color, id=f"access-status-{index}")
            with panel.left():
                for index, (code, value, color, percent) in enumerate(ACCESS_METERS):
                    lcars.progress(
                        f"{code}  {value}".strip(),
                        percent,
                        color=color,
                        options=lcars.MeterOptions(segments=4, ticks=False),
                        id=f"access-meter-{index}",
                    )


BUILDERS = {
    "seismic": _seismic_ui,
    "periodic": _periodic_ui,
    "holodeck": _holodeck_ui,
    "access": _access_ui,
}


def ui() -> None:
    try:
        builder = BUILDERS[DESIGN]
    except KeyError as exc:
        choices = ", ".join(sorted(BUILDERS))
        raise ValueError(f"Unknown LCARS_CANON_DESIGN={DESIGN!r}; choose {choices}") from exc
    builder()


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8140")),
        open_browser=False,
    )
