"""Write rendered/target/diff artifact set for target-bank comparisons."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageStat


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Write target-bank comparison artifacts.")
    parser.add_argument("--rendered", required=True, help="Path to rendered screenshot PNG.")
    parser.add_argument("--target", required=True, help="Path to canonical target PNG.")
    parser.add_argument("--target-id", required=True, help="Canonical target identifier.")
    parser.add_argument("--output-dir", required=True, help="Directory where artifacts will be written.")
    return parser


def _write_artifacts(rendered_path: Path, target_path: Path, target_id: str, output_dir: Path) -> dict[str, object]:
    output_dir.mkdir(parents=True, exist_ok=True)

    rendered_copy = output_dir / "rendered.png"
    target_copy = output_dir / "target.png"
    diff_copy = output_dir / "diff.png"
    metadata_path = output_dir / "metadata.json"

    shutil.copyfile(rendered_path, rendered_copy)
    shutil.copyfile(target_path, target_copy)

    rendered = Image.open(rendered_path).convert("RGBA")
    target = Image.open(target_path).convert("RGBA")
    if rendered.size != target.size:
        raise ValueError(
            f"Rendered image size {rendered.size} does not match target size {target.size} for {target_id}."
        )

    diff = ImageChops.difference(rendered, target)
    diff.save(diff_copy)

    mismatch_pixels = 0
    pixels = diff.load()
    for y in range(diff.height):
        for x in range(diff.width):
            if any(channel != 0 for channel in pixels[x, y]):
                mismatch_pixels += 1

    blurred_diff = ImageChops.difference(
        rendered.filter(ImageFilter.GaussianBlur(1)),
        target.filter(ImageFilter.GaussianBlur(1)),
    )
    structural_mismatch_pixels = 0
    blurred_pixels = blurred_diff.load()
    for y in range(blurred_diff.height):
        for x in range(blurred_diff.width):
            if any(channel > 16 for channel in blurred_pixels[x, y]):
                structural_mismatch_pixels += 1

    total_pixels = rendered.size[0] * rendered.size[1]
    mean_channel_difference = ImageStat.Stat(diff).mean[:3]
    metadata = {
        "target_id": target_id,
        "output_dir": str(output_dir),
        "rendered_path": str(rendered_copy),
        "target_path": str(target_copy),
        "diff_path": str(diff_copy),
        "size": {"width": rendered.size[0], "height": rendered.size[1]},
        "total_pixels": total_pixels,
        "mismatch_pixels": mismatch_pixels,
        "mismatch_ratio": mismatch_pixels / total_pixels if total_pixels else 0,
        "structural_mismatch_pixels": structural_mismatch_pixels,
        "structural_mismatch_ratio": structural_mismatch_pixels / total_pixels if total_pixels else 0,
        "mean_abs_diff": {
            "red": mean_channel_difference[0],
            "green": mean_channel_difference[1],
            "blue": mean_channel_difference[2],
        },
        "mean_channel_difference": {
            "red": mean_channel_difference[0],
            "green": mean_channel_difference[1],
            "blue": mean_channel_difference[2],
        },
    }
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return {
        "target_id": target_id,
        "output_dir": str(output_dir),
        "total_pixels": total_pixels,
        "mismatch_pixels": mismatch_pixels,
        "mismatch_ratio": metadata["mismatch_ratio"],
        "structural_mismatch_pixels": structural_mismatch_pixels,
        "structural_mismatch_ratio": metadata["structural_mismatch_ratio"],
    }


def main() -> int:
    args = _build_parser().parse_args()
    summary = _write_artifacts(
        rendered_path=Path(args.rendered),
        target_path=Path(args.target),
        target_id=args.target_id,
        output_dir=Path(args.output_dir),
    )
    print(json.dumps(summary))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
