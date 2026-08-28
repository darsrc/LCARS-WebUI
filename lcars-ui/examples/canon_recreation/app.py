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
from lcars_ui import App

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


Rect = tuple[int, int, int, int]


def _authored_tracks(
    width: int, height: int, rects: list[Rect]
) -> tuple[list[str], list[str], dict[Rect, dict[str, int]]]:
    """Turn measured pixel rectangles into compact proportional grid tracks."""
    x_points = sorted({0, width, *(point for x1, _, x2, _ in rects for point in (x1, x2))})
    y_points = sorted({0, height, *(point for _, y1, _, y2 in rects for point in (y1, y2))})
    columns = [f"{end - start}fr" for start, end in zip(x_points, x_points[1:], strict=False)]
    rows = [f"{end - start}fr" for start, end in zip(y_points, y_points[1:], strict=False)]
    placements: dict[Rect, dict[str, int]] = {}
    for rect in rects:
        x1, y1, x2, y2 = rect
        column = x_points.index(x1) + 1
        row = y_points.index(y1) + 1
        placements[rect] = {
            "column": column,
            "row": row,
            "column_span": x_points.index(x2) - column + 1,
            "row_span": y_points.index(y2) - row + 1,
        }
    return columns, rows, placements


def _seismic_ui() -> None:
    app.config(
        "Penthara IV Seismic Activity Monitor",
        subtitle="Planetary Sensor Array",
        theme="nemesis",
        header_color="pale-canary",
        settings_page=False,
    )
    frame_bars: list[tuple[str, Rect, str, str]] = [
        ("top-rail", (0, 0, 123, 99), "#d9d5d2", "start"),
        ("top-code", (0, 101, 123, 209), "#f5b786", "none"),
        ("upper-elbow", (0, 210, 415, 232), "#f5b786", "start"),
        ("divider-a", (417, 210, 448, 232), "#d8c7e8", "none"),
        ("divider-b", (450, 210, 564, 232), "#f5b786", "none"),
        ("divider-c", (566, 210, 943, 232), "#d8c7e8", "none"),
        ("divider-d", (945, 210, 982, 232), "#f5b786", "end"),
        ("lower-elbow", (0, 237, 415, 261), "#d8c7e8", "start"),
        ("lower-divider-a", (417, 237, 448, 261), "#f5b786", "none"),
        ("lower-divider-b", (450, 237, 564, 261), "#d8c7e8", "none"),
        ("lower-divider-c", (566, 237, 943, 261), "#f5b786", "none"),
        ("lower-divider-d", (945, 237, 982, 261), "#d8c7e8", "end"),
        ("side-02", (0, 263, 123, 345), "#d8c7e8", "none"),
        ("side-03", (0, 347, 123, 503), "#f5b786", "none"),
        ("side-04", (0, 505, 123, 553), "#e2a45e", "none"),
        ("side-05", (0, 555, 123, 748), "#f5b786", "none"),
    ]
    grid_rects: list[Rect] = [
        *((128 + index * 61, 347, 130 + index * 61, 746) for index in range(15)),
        *((128, y, 980, y + 2) for y in (347, 451, 503, 520, 552, 621, 744)),
    ]
    waveform_rects: list[Rect] = []
    baseline = 522
    for index, value in enumerate(SEISMIC_SIGNAL):
        x = 131 + round(index * 7.78)
        height = max(2, round(abs(value) * 2.25))
        waveform_rects.append(
            (x, baseline - height, x + 5, baseline)
            if value >= 0
            else (x, baseline, x + 5, min(742, baseline + height))
        )
    data_lines = [
        "1213  64759551  9840  7073  388  646  8657  568  000982  604001",
        "8990  33571516  7107  9523  367  198  5901  117  009277  147005",
        "1450  79809360  2984  1253  971  532  3280  762  006615  943222",
        "2557  78251596  0876  4742  090  881  4614  235  001265  717373",
        "1037  81639406  8481  7372  750  521  3823  733  007950  578452",
        "1041  87557455  9811  0422  850  694  4600  758  003197  168951",
    ]
    text_items: list[tuple[str, Rect, str, str, str]] = [
        (
            "title",
            (325, 4, 975, 50),
            "PENTHARA IV SEISMIC ACTIVITY MONITOR",
            "h1",
            "#f8efae",
        ),
        ("top-label", (12, 55, 113, 94), "0-99\nLCARS 416176", "micro", "#000000"),
        ("top-code-label", (12, 116, 113, 190), "100-209\n01-4501765", "micro", "#000000"),
        ("side-02-label", (7, 278, 115, 330), "02-4171065", "label", "#000000"),
        ("side-03-label", (7, 360, 115, 398), "03-7835565", "label", "#000000"),
        ("side-04-label", (7, 516, 115, 548), "04-4755260", "label", "#000000"),
        ("side-05-label", (7, 570, 115, 608), "05-4788265", "label", "#000000"),
        (
            "array-online",
            (472, 277, 970, 322),
            "PLANETARY SENSOR ARRAY ON LINE",
            "h2",
            "#7da9df",
        ),
        (
            "range",
            (127, 323, 980, 344),
            "22,000       24,000       26,000       28,000       "
            "30,000       32,000       35,000",
            "micro",
            "#d1a676",
        ),
        ("axis-zero", (951, 506, 979, 520), "0.0", "micro", "#d1a676"),
    ]
    for index, line in enumerate(data_lines):
        text_items.append(
            (
                f"bank-{index}",
                (186, 76 + 20 * index, 979, 94 + 20 * index),
                line,
                "mono",
                "#ded2e8",
            )
        )

    rects = [
        *(rect for _, rect, _, _ in frame_bars),
        *grid_rects,
        *waveform_rects,
        *(rect for _, rect, *_ in text_items),
    ]
    columns, rows, placement = _authored_tracks(984, 750, rects)
    with lcars.composition(
        columns=columns,
        rows=rows,
        design_size=(984, 750),
        min_width=760,
        narrow="scale",
        id="seismic-composition",
    ) as composition:
        for area_id, rect, color, caps in frame_bars:
            with composition.area(area_id, **placement[rect], decorative=True):
                lcars.bar(
                    color=color,
                    caps=caps,
                    thickness=min(200, rect[3] - rect[1]),
                    id=f"{area_id}-bar",
                )
        for index, rect in enumerate(grid_rects):
            with composition.area(
                f"plot-grid-{index}",
                **placement[rect],
                layer=0 if index < 15 else 1,
                decorative=True,
            ):
                lcars.bar(
                    color="#927650",
                    thickness=min(200, rect[3] - rect[1]),
                    id=f"plot-grid-bar-{index}",
                )
        for index, rect in enumerate(waveform_rects):
            with composition.area(
                f"signal-{index}", **placement[rect], layer=2, decorative=True
            ):
                lcars.bar(
                    color="#ebc8e8",
                    thickness=min(200, rect[3] - rect[1]),
                    id=f"signal-bar-{index}",
                )
        for area_id, rect, content, size, color in text_items:
            with composition.area(area_id, **placement[rect], layer=3):
                lcars.text(
                    content,
                    size=size,
                    align="end" if area_id == "array-online" else "start",
                    color=color,
                    id=f"{area_id}-text",
                )


def _periodic_ui() -> None:
    app.config(
        "Table of Elements 99823",
        subtitle="Starfleet Educational Materials",
        theme="tng",
        header_color="orange",
        settings_page=False,
    )
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
    columns = [f"{end - start}fr" for start, end in zip(x_points, x_points[1:], strict=False)]
    rows = [f"{end - start}fr" for start, end in zip(y_points, y_points[1:], strict=False)]

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
                    thickness=min(200, rect[3] - rect[1]),
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
    app.config(
        "Holodeck Programming",
        subtitle="LCARS Simulation Index",
        theme="nemesis",
        header_color="atomic-tangerine",
        settings_page=False,
    )
    salmon = "#f3a06f"
    lilac = "#d9b8e8"
    yellow = "#f7d778"
    bars: list[tuple[str, Rect, str, str, int]] = [
        ("top-mass", (4, 5, 606, 275), salmon, "start", 0),
        ("top-terminal", (1304, 5, 1381, 75), salmon, "end", 0),
        ("top-cutout-a", (332, 96, 606, 164), "#000000", "start", 1),
        ("top-cutout-b", (363, 214, 606, 275), "#000000", "none", 1),
        ("inner-rail", (363, 164, 1119, 213), salmon, "start", 2),
        ("left-ss", (4, 367, 292, 413), yellow, "start", 0),
        ("left-rk-rs", (4, 430, 336, 478), salmon, "start", 0),
        ("left-rk-ber", (4, 557, 292, 604), lilac, "start", 0),
        ("left-e-aei", (4, 621, 336, 668), yellow, "start", 0),
        ("left-b-ams", (4, 684, 336, 731), lilac, "start", 0),
        ("left-m-et", (4, 747, 292, 795), yellow, "start", 0),
        ("marker-20", (384, 304, 415, 350), lilac, "none", 0),
        ("marker-451", (384, 557, 415, 604), salmon, "none", 0),
        ("marker-947", (384, 684, 415, 731), lilac, "none", 0),
        ("marker-88", (384, 747, 415, 795), yellow, "none", 0),
        ("right-rail", (969, 304, 1069, 858), salmon, "none", 0),
        ("right-notch-top", (933, 304, 958, 350), lilac, "none", 0),
        ("right-notch-a", (1090, 304, 1113, 350), salmon, "none", 0),
        ("right-notch-b", (1090, 367, 1113, 414), yellow, "none", 0),
        ("right-notch-c", (1090, 557, 1113, 604), lilac, "none", 0),
        ("right-notch-d", (1090, 621, 1113, 668), salmon, "none", 0),
        ("right-notch-e", (1090, 811, 1113, 858), salmon, "none", 0),
        ("bottom-mass", (4, 938, 606, 1075), salmon, "start", 0),
        ("bottom-cutout", (332, 938, 606, 1013), "#000000", "start", 1),
        ("bottom-rail", (363, 1013, 1119, 1075), salmon, "none", 2),
        ("bottom-terminal", (1304, 1013, 1381, 1075), salmon, "end", 0),
    ]
    choices: list[tuple[str, Rect, str]] = [
        ("MR SRT", (494, 621, 606, 668), salmon),
        ("JL NC", (624, 621, 736, 668), lilac),
        ("BN SPN", (754, 621, 866, 668), yellow),
        ("GZ KR", (624, 684, 736, 731), "#ec5f65"),
        ("GN RBY", (754, 684, 866, 731), salmon),
        ("DG DXR", (494, 747, 606, 795), lilac),
        ("M OKA", (624, 747, 736, 795), salmon),
        ("MK DRN", (754, 747, 866, 795), yellow),
        ("NL TRE", (494, 811, 606, 858), salmon),
        ("W GBG", (1124, 304, 1270, 350), salmon),
        ("LV BRT", (1124, 367, 1270, 414), yellow),
        ("W WTN", (1124, 557, 1270, 604), lilac),
        ("EZ TW", (1124, 621, 1270, 668), salmon),
        ("JE DC", (1124, 811, 1270, 858), salmon),
        ("JN FKS", (494, 949, 606, 996), lilac),
        ("RH BS", (624, 949, 736, 996), salmon),
        ("JG TFX", (754, 949, 866, 996), yellow),
        ("ER CGV", (1124, 949, 1270, 996), lilac),
    ]
    bank_lines = "\n".join(
        f"{row['SEQ']:>4}   {row['GRP']:>2}   {row['INDEX']:>8}   "
        f"{row['VECTOR']:>8}   {row['STATE']:>6}"
        for row in HOLODECK_ROWS[:4]
    )
    lower_bank_lines = "\n".join(
        f"{row['SEQ']:>4}   {row['GRP']:>2}   {row['INDEX']:>8}   "
        f"{row['VECTOR']:>8}   {row['STATE']:>6}"
        for row in HOLODECK_ROWS[5:7]
    )
    text_items: list[tuple[str, Rect, str, str, str, str]] = [
        ("title", (622, 5, 1291, 82), "HOLODECK PROGRAMMING", "display", salmon, "start"),
        ("inner-label", (1014, 174, 1111, 204), "LCARS", "h2", "#000000", "end"),
        ("left-ss-label", (154, 375, 282, 405), "SS WCT", "h1", "#000000", "end"),
        ("left-rs-label", (190, 440, 326, 470), "RK RS", "h1", "#000000", "end"),
        ("left-ber-label", (147, 567, 282, 597), "RK BER", "h1", "#000000", "end"),
        ("left-aei-label", (196, 631, 326, 661), "E AEI", "h1", "#000000", "end"),
        ("left-ams-label", (188, 694, 326, 724), "B AMS", "h1", "#000000", "end"),
        ("left-met-label", (163, 757, 282, 787), "M ET", "h1", "#000000", "end"),
        ("bank", (493, 304, 891, 481), bank_lines, "mono", salmon, "start"),
        ("lower-bank", (493, 557, 891, 605), lower_bank_lines, "mono", salmon, "start"),
        ("marker-20-label", (384, 308, 415, 346), "20", "h1", "#000000", "center"),
        ("marker-451-label", (384, 565, 415, 596), "451", "label", "#000000", "center"),
        ("marker-947-label", (384, 692, 415, 723), "947", "label", "#000000", "center"),
        ("marker-88-label", (384, 755, 415, 786), "88", "label", "#000000", "center"),
        (
            "right-code",
            (977, 319, 1061, 838),
            "8302\n\n6749\n\n4675\n\n2900\n\n8764\n\n1358",
            "h1",
            "#000000",
            "center",
        ),
        ("bottom-lcars", (925, 1030, 1108, 1065), "LCARS", "h1", "#000000", "end"),
    ]
    rects = [
        *(rect for _, rect, *_ in bars),
        *(rect for _, rect, _ in choices),
        *(rect for _, rect, *_ in text_items),
    ]
    columns, rows, placement = _authored_tracks(1388, 1080, rects)
    with lcars.composition(
        columns=columns,
        rows=rows,
        design_size=(1388, 1080),
        min_width=960,
        narrow="scale",
        id="holodeck-composition",
    ) as composition:
        for area_id, rect, color, caps, layer in bars:
            with composition.area(area_id, **placement[rect], layer=layer, decorative=True):
                lcars.bar(
                    color=color,
                    caps=caps,
                    thickness=min(200, rect[3] - rect[1]),
                    id=f"{area_id}-bar",
                )
        for index, (label, rect, color) in enumerate(choices):
            with composition.area(f"choice-{index}", **placement[rect], layer=3):
                lcars.button(label, color=color, id=f"holo-choice-{index}")
        for area_id, rect, content, size, color, align in text_items:
            with composition.area(area_id, **placement[rect], layer=4):
                lcars.text(
                    content,
                    size=size,
                    align=align,
                    color=color,
                    id=f"{area_id}-text",
                )


def _access_ui() -> None:
    app.config(
        "LCARS Computer Access 54 ADGE",
        subtitle="Offline Authorization Channel",
        theme="tng",
        header_color="lilac",
        settings_page=False,
    )
    lilac = "#cbb1df"
    blue = "#9c9ee8"
    yellow = "#f5d071"
    red = "#b5484f"
    orange = "#e78b43"
    menu_bars: list[tuple[str, Rect, str, str]] = [
        ("top-left-cap", (11, 18, 65, 77), blue, "start"),
        ("top-left-rail", (65, 18, 885, 77), lilac, "none"),
        ("top-right-cap", (1627, 18, 1671, 77), blue, "end"),
        ("menu-comm", (65, 94, 254, 309), blue, "none"),
        ("menu-systems", (265, 94, 547, 309), yellow, "none"),
        ("menu-mode", (556, 94, 1205, 309), lilac, "none"),
        ("menu-lcars", (1212, 94, 1451, 309), blue, "none"),
        ("menu-2005", (1459, 94, 1641, 309), red, "end"),
        ("right-red-top", (1589, 309, 1641, 570), red, "none"),
        ("right-55", (1589, 581, 1641, 671), orange, "none"),
        ("right-red-bottom", (1589, 682, 1641, 958), red, "none"),
        ("right-foot", (541, 957, 1641, 971), red, "end"),
        ("bottom-left-cap", (11, 996, 65, 1063), blue, "start"),
        ("bottom-rail", (370, 996, 1615, 1063), lilac, "none"),
        ("bottom-right-cap", (1627, 996, 1671, 1063), blue, "end"),
    ]
    meter_colors = {
        "lilac": lilac,
        "blue-bell": blue,
        "orange": orange,
        "chestnut-rose": red,
        "golden-tanoi": yellow,
    }
    meter_bars: list[tuple[str, Rect, str, str]] = []
    meter_texts: list[tuple[str, Rect, str, str, str, str]] = []
    for index, (code, value, role, percent) in enumerate(ACCESS_METERS):
        y = 346 + index * 70
        width = 92 + round(180 * percent / 100)
        color = meter_colors[role]
        meter_bars.extend(
            [
                (f"meter-code-{index}", (263, y, 342, y + 54), color, "none"),
                (f"meter-value-{index}", (350, y, 350 + width, y + 54), color, "end"),
            ]
        )
        meter_texts.extend(
            [
                (
                    f"meter-code-label-{index}",
                    (272, y + 10, 335, y + 43),
                    code,
                    "h1",
                    "#000000",
                    "center",
                ),
                (
                    f"meter-value-label-{index}",
                    (365, y + 10, 350 + width - 14, y + 43),
                    value or f"{percent:03d}",
                    "h1",
                    "#000000",
                    "end",
                ),
            ]
        )
    status_rows = [
        ("AUDIO-VISUAL INTERFACE READY", lilac),
        ("USER INPUT PATHWAYS DEFINED", yellow),
        ("UNIVERSAL TRANSLATOR ONLINE", blue),
        ("SUBSPACE COMMUNICATIONS CHANNEL OPEN", lilac),
        ("BIO-NEURAL CIRCUITRY OPERATIONAL", orange),
        ("LCARS LIBRARY", red),
    ]
    status_texts: list[tuple[str, Rect, str, str, str, str]] = []
    status_chips: list[tuple[str, Rect, str, str]] = []
    for index, (label, color) in enumerate(status_rows):
        y = 386 + index * 82
        status_texts.append(
            (f"status-{index}", (590, y, 1468, y + 51), label, "h1", orange, "end")
        )
        status_chips.append(
            (f"status-chip-{index}", (1487, y - 5, 1514, y + 56), color, "none")
        )
    text_items: list[tuple[str, Rect, str, str, str, str]] = [
        (
            "title",
            (892, 19, 1609, 77),
            "LCARS COMPUTER ACCESS 54 ADGE •",
            "h1",
            "#f59b18",
            "start",
        ),
        ("comm-label", (82, 250, 238, 291), "COMM", "h1", "#000000", "center"),
        ("systems-label", (293, 250, 519, 291), "SYSTEMS", "h1", "#000000", "center"),
        ("mode-label", (697, 250, 1065, 291), "MODE SELECT", "h1", "#000000", "center"),
        ("lcars-label", (1254, 250, 1414, 291), "LCARS", "h1", "#000000", "center"),
        ("year-label", (1490, 250, 1605, 291), "2005", "h1", "#000000", "center"),
        ("authorization", (1190, 885, 1468, 938), "AUTHORIZATION", "h1", yellow, "end"),
        ("auth-code", (1593, 602, 1638, 649), "55", "h1", "#000000", "center"),
        (
            "console",
            (72, 1008, 361, 1054),
            "CONSOLE 54 ADGE",
            "h1",
            "#f59b18",
            "start",
        ),
        *meter_texts,
        *status_texts,
    ]
    bars = [*menu_bars, *meter_bars, *status_chips]
    rects = [*(rect for _, rect, *_ in bars), *(rect for _, rect, *_ in text_items)]
    columns, rows, placement = _authored_tracks(1682, 1080, rects)
    with lcars.composition(
        columns=columns,
        rows=rows,
        design_size=(1682, 1080),
        min_width=1080,
        narrow="scale",
        id="access-composition",
    ) as composition:
        for area_id, rect, color, caps in bars:
            with composition.area(
                area_id,
                **placement[rect],
                layer=1 if area_id == "right-foot" else 0,
                decorative=True,
            ):
                lcars.bar(
                    color=color,
                    caps=caps,
                    thickness=min(200, rect[3] - rect[1]),
                    id=f"{area_id}-bar",
                )
        for area_id, rect, content, size, color, align in text_items:
            with composition.area(area_id, **placement[rect], layer=1):
                lcars.text(
                    content,
                    size=size,
                    align=align,
                    color=color,
                    id=f"{area_id}-text",
                )


BUILDERS = {
    "seismic": _seismic_ui,
    "periodic": _periodic_ui,
    "holodeck": _holodeck_ui,
    "access": _access_ui,
}

app = App()


@app.page(
    "Canon Recreation",
    id="screen",
    layout="authored",
    chrome="none",
    fillers=False,
    sizing="content",
)
def ui() -> None:
    try:
        builder = BUILDERS[DESIGN]
    except KeyError as exc:
        choices = ", ".join(sorted(BUILDERS))
        raise ValueError(f"Unknown LCARS_CANON_DESIGN={DESIGN!r}; choose {choices}") from exc
    builder()


if __name__ == "__main__":
    import uvicorn

    from lcars_ui.app import create_app

    uvicorn.run(
        create_app(manifest=app.build_manifest(), app=app),
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8140")),
    )
