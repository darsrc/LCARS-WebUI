"""Measured, code-rendered recreation of a canonical TNG LCARS display.

The target is the Pentharan seismic activity monitor preserved in ``LCARS_TRUTH``.
Reference pixels are used only for measurement and validation; the rendered page is
entirely Surface geometry and ordinary HTML text regions.
"""

from __future__ import annotations

import os
from typing import Any

import lcars_ui as lcars
from lcars_ui import App, advanced, ui

DESIGN_SIZE = (984, 750)
SCREEN = os.getenv("LCARS_GAUNTLET_SCREEN", "seismic_monitor").lower()
SCREENS = ("seismic_monitor",)

BLACK = "#000000"
INK_DARK = "#17100d"
PEACH = "#d8a992"
PALE_PEACH = "#caadb2"
LILAC = "#ceb3bf"
PALE_LILAC = "#d1cad4"
TERMINAL = "#b5a4b5"
SELECTED = "#d1a247"
GRID = "#b8a57e"
WAVE = "#d8c6d0"
TITLE = "#e4e1c8"
BLUE = "#5272b7"

DATA_BANK = "\n".join(
    [
        "3055  25054800  2  1541  4031  2119  1261  5039  9064  1345     "
        "244  4001  15  53     59419533576762249517390780680     367  299  808",
        "7187  67599654  6  6460  5726  7955  6170  8971  3860  9595    "
        "7551  9059  54  45     1073104600929061182330644032      456  467  999",
        "2735  82165938  4  2282  6853  4180  6294  8325  6598  7796    "
        "5470  3550  11  35     14720779211688764397793854798     575  655  265",
        "1649  56692968  1  8207  8750  1195  2288  1318  8793  8553    "
        "9687  9823  14  72     892192561873611945496821144420259    801  940  227",
        "1988  40782609  6  9682  5657  1219  6477  7602  1377  8865    "
        "7557   601  80  28     6900143881881625719715204314621     129  136  672",
        "  70  50765309  6  1485  2076  8993  7925  9188  5647  4421    "
        "4311  1668  50  14     4436828683522134163017138020312     539  498  840",
        "0899  51868460  8  5006   075  1889  7768  5477  6098  2600    "
        "4943  0794  43  96     4716509685271298360746890365932     290  445  120",
    ]
)

AXIS_LABELS = (
    "8.000",
    "10.000",
    "11.000",
    "12.000",
    "13.000",
    "14.000",
    "15.000",
    "16.000",
    "17.000",
    "18.000",
    "19.000",
    "20.000",
    "21.000",
    "22.000",
)


def _waveform_bars(surface: Any) -> None:
    """Paint measured vertical sample extents from the reference waveform."""
    carrier_pattern = [
        (4, 7),
        (7, 5),
        (3, 9),
        (8, 4),
        (5, 6),
        (2, 8),
        (6, 3),
        (4, 5),
        (9, 4),
        (3, 7),
        (5, 3),
        (7, 6),
    ]
    for index, x in enumerate(range(130, 909, 8)):
        up, down = carrier_pattern[index % len(carrier_pattern)]
        surface.rect(
            x,
            529 - up,
            5,
            up + down,
            color=WAVE,
            id=f"seismic-carrier-{index:03d}",
        )

    samples = [
        (134, 134, 519, 534),
        (136, 141, 521, 532),
        (151, 157, 493, 567),
        (159, 164, 522, 535),
        (264, 269, 522, 535),
        (271, 276, 512, 571),
        (279, 284, 468, 598),
        (286, 289, 484, 571),
        (298, 299, 522, 536),
        (316, 322, 522, 538),
        (324, 329, 454, 616),
        (332, 337, 454, 616),
        (339, 344, 522, 537),
        (347, 351, 516, 544),
        (355, 360, 489, 573),
        (369, 374, 371, 703),
        (376, 381, 438, 626),
        (383, 389, 484, 577),
        (391, 397, 417, 649),
        (399, 404, 460, 604),
        (406, 409, 377, 707),
        (414, 419, 428, 630),
        (421, 427, 358, 724),
        (429, 434, 382, 691),
        (437, 442, 386, 689),
        (444, 449, 498, 561),
        (452, 457, 414, 648),
        (459, 464, 358, 724),
        (467, 471, 508, 561),
        (476, 480, 362, 709),
        (482, 487, 385, 674),
        (489, 495, 481, 577),
        (497, 502, 460, 601),
        (504, 510, 462, 595),
        (512, 517, 467, 583),
        (520, 525, 500, 561),
        (527, 531, 522, 544),
        (536, 540, 500, 562),
        (542, 548, 522, 535),
        (550, 555, 522, 541),
        (557, 563, 522, 535),
        (565, 570, 522, 532),
        (572, 578, 522, 531),
        (580, 585, 498, 564),
        (587, 591, 416, 649),
        (596, 600, 515, 542),
        (603, 608, 522, 544),
        (627, 632, 508, 561),
        (635, 640, 463, 603),
        (642, 647, 508, 547),
        (650, 653, 456, 616),
        (660, 663, 466, 595),
        (665, 670, 499, 561),
        (672, 678, 520, 538),
        (682, 685, 522, 531),
        (687, 693, 522, 545),
        (695, 700, 522, 545),
        (703, 705, 522, 538),
        (757, 763, 498, 571),
        (765, 770, 468, 598),
        (778, 778, 484, 571),
        (780, 785, 522, 534),
        (810, 815, 517, 539),
        (818, 823, 454, 616),
        (825, 825, 522, 535),
        (830, 831, 517, 535),
        (833, 835, 514, 542),
        (841, 846, 488, 571),
        (855, 860, 371, 703),
        (862, 868, 438, 626),
        (870, 875, 484, 577),
        (877, 883, 417, 653),
        (885, 890, 460, 604),
        (892, 893, 378, 705),
        (900, 905, 432, 630),
    ]
    for index, (x1, x2, y1, y2) in enumerate(samples):
        surface.rect(
            x1,
            y1,
            x2 - x1 + 1,
            y2 - y1 + 1,
            color=WAVE,
            id=f"seismic-sample-{index:02d}",
        )

    trace_values = [
        529,
        524,
        532,
        526,
        531,
        521,
        534,
        525,
        530,
        523,
        533,
        527,
        530,
        525,
        534,
        523,
        529,
        526,
        533,
        524,
        530,
        522,
        532,
        526,
        530,
        524,
        534,
        525,
        529,
        523,
        532,
        526,
        531,
        524,
        533,
        525,
        529,
        522,
        534,
        526,
        530,
        524,
        532,
        525,
        531,
        523,
        533,
        526,
        529,
        524,
        534,
        525,
        530,
        522,
        532,
        526,
        531,
        524,
        533,
        525,
        529,
        523,
        534,
        526,
        530,
        524,
        532,
        525,
        531,
        523,
        533,
        526,
        529,
        524,
        534,
        525,
        530,
        522,
        532,
        526,
        531,
        524,
        533,
        525,
    ]
    surface.path(
        [
            {
                "op": "move" if index == 0 else "line",
                "x": 132 + index * 10,
                "y": y,
            }
            for index, y in enumerate(trace_values)
        ],
        filled=False,
        color=WAVE,
        id="seismic-trace",
    )


def _seismic_monitor() -> None:
    app.config(
        "Pentharan Seismic Monitor",
        subtitle="Measured TNG Surface recreation",
        theme="tng",
        settings_page=False,
    )
    with advanced.surface(
        design_size=DESIGN_SIZE,
        min_width=720,
        narrow="scale",
        id="seismic-surface",
    ) as surface:
        surface.rect(0, 0, 984, 750, color=BLACK, id="seismic-viewport-base")

        # Upper identity rail and the two transfer bands are measured from frame 120.
        surface.rect(2, 2, 120, 96, color=PALE_PEACH, id="seismic-id-block")
        surface.path(
            [
                {"op": "move", "x": 96, "y": 233},
                {"op": "line", "x": 416, "y": 233},
                {"op": "line", "x": 416, "y": 211},
                {"op": "line", "x": 168, "y": 211},
                {
                    "op": "arc",
                    "rx": 45,
                    "ry": 55,
                    "x": 123,
                    "y": 156,
                    "sweep": 1,
                },
                {"op": "line", "x": 123, "y": 100},
                {"op": "line", "x": 2, "y": 100},
                {"op": "line", "x": 2, "y": 156},
                {
                    "op": "arc",
                    "rx": 94,
                    "ry": 77,
                    "x": 96,
                    "y": 233,
                    "sweep": 0,
                },
                {"op": "close"},
            ],
            color=PEACH,
            id="seismic-upper-elbow",
        )
        surface.rect(420, 211, 26, 22, color=PEACH, id="seismic-upper-key")
        surface.rect(450, 211, 116, 22, color=PALE_LILAC, id="seismic-upper-band-a")
        surface.rect(570, 211, 372, 22, color=PALE_LILAC, id="seismic-upper-band-b")
        surface.rect(946, 211, 36, 22, color=TERMINAL, id="seismic-upper-terminal")

        surface.path(
            [
                {"op": "move", "x": 96, "y": 238},
                {"op": "line", "x": 416, "y": 238},
                {"op": "line", "x": 416, "y": 260},
                {"op": "line", "x": 168, "y": 260},
                {
                    "op": "arc",
                    "rx": 45,
                    "ry": 55,
                    "x": 123,
                    "y": 315,
                    "sweep": 0,
                },
                {"op": "line", "x": 123, "y": 345},
                {"op": "line", "x": 2, "y": 345},
                {"op": "line", "x": 2, "y": 315},
                {
                    "op": "arc",
                    "rx": 94,
                    "ry": 77,
                    "x": 96,
                    "y": 238,
                    "sweep": 1,
                },
                {"op": "close"},
            ],
            color=LILAC,
            id="seismic-lower-elbow",
        )
        surface.rect(420, 238, 26, 22, color=LILAC, id="seismic-lower-key")
        surface.rect(450, 238, 116, 22, color=PALE_LILAC, id="seismic-lower-band-a")
        surface.rect(570, 238, 372, 22, color=LILAC, id="seismic-lower-band-b")
        surface.rect(946, 238, 36, 22, color=TERMINAL, id="seismic-lower-terminal")

        # The selector column is physically continuous with the lower elbow.
        surface.rect(2, 347, 120, 155, color=PEACH, id="seismic-event-03")
        surface.rect(2, 504, 120, 49, color=SELECTED, id="seismic-event-04")
        surface.rect(2, 556, 120, 191, color=PEACH, id="seismic-event-05")

        # Dominant telemetry grid: 852 x 399 px, matching the reference plot boundary.
        for index, x in enumerate(
            [128, 169, 229, 290, 352, 411, 472, 533, 593, 654, 715, 775, 836, 897, 957, 975]
        ):
            surface.rect(x, 347, 3, 399, color=GRID, id=f"seismic-grid-v-{index:02d}")
        for index, (y, h) in enumerate(
            [(347, 3), (450, 3), (505, 3), (526, 3), (549, 3), (621, 3), (742, 4)]
        ):
            surface.rect(128, y, 850, h, color=GRID, id=f"seismic-grid-h-{index:02d}")

        _waveform_bars(surface)
        surface.ellipse(928, 629, 19, 8, color="#e8dedc", id="seismic-event-marker")

        with surface.region("seismic-id-copy", x=12, y=68, w=100, h=24):
            ui.text("LCARS 416176", size="label", color=INK_DARK, id="seismic-lcars-id")
        with surface.region("seismic-upper-code", x=12, y=108, w=100, h=34):
            ui.text("01-4501765", size="label", color=INK_DARK, id="seismic-code-01")
        with surface.region("seismic-event-02-copy", x=8, y=312, w=105, h=24):
            ui.text("02-4171065", size="label", color=INK_DARK, id="seismic-code-02")
        with surface.region("seismic-event-03-copy", x=8, y=474, w=105, h=24):
            ui.text("03-7835565", size="label", color=INK_DARK, id="seismic-code-03")
        with surface.region("seismic-event-04-copy", x=8, y=514, w=105, h=30):
            ui.text("04-4755260", size="label", color=INK_DARK, id="seismic-code-04")
        with surface.region("seismic-event-05-copy", x=8, y=564, w=105, h=34):
            ui.text("05-4788265", size="label", color=INK_DARK, id="seismic-code-05")

        with surface.region("seismic-title", x=330, y=2, w=645, h=62):
            ui.text(
                "PENTHARA IV SEISMIC ACTIVITY MONITOR",
                size="h1",
                color=TITLE,
                align="end",
                id="seismic-title-text",
            )
        with surface.region("seismic-data-bank", x=186, y=74, w=790, h=128):
            ui.text(
                DATA_BANK,
                size="micro",
                color=LILAC,
                options=lcars.TextOptions(wrap="pre", selectable=False),
                id="seismic-data-text",
            )
        with surface.region("seismic-array-state", x=484, y=276, w=492, h=58):
            ui.text(
                "PLANETARY SENSOR ARRAY ONLINE",
                size="h1",
                color=BLUE,
                align="end",
                id="seismic-array-state-text",
            )
        for index, label in enumerate(AXIS_LABELS):
            with surface.region(
                f"seismic-axis-bottom-{index:02d}",
                x=140 + index * 61,
                y=724,
                w=28,
                h=18,
            ):
                ui.text(
                    label,
                    size="micro",
                    color=PEACH,
                    align="end",
                    options=lcars.TextOptions(wrap="nowrap", selectable=False),
                    id=f"seismic-axis-bottom-text-{index:02d}",
                )
        with surface.region("seismic-axis-right", x=950, y=356, w=28, h=278):
            ui.text(
                "5x10\n\n1x10\n\n5x10\n0.0\n5x10\n\n1x10",
                size="micro",
                color=PEACH,
                align="end",
                options=lcars.TextOptions(wrap="pre", selectable=False),
                id="seismic-axis-right-text",
            )


app = App()


@app.page(
    "Pentharan Seismic Monitor",
    id="seismic-monitor",
    layout="authored",
    chrome="none",
    fillers=False,
    sizing="content",
)
def build() -> None:
    if SCREEN not in SCREENS:
        raise ValueError(f"Unknown LCARS_GAUNTLET_SCREEN={SCREEN!r}; choose {SCREENS}")
    _seismic_monitor()


if __name__ == "__main__":

    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8078")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
