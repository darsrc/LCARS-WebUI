/** Return the WCAG relative luminance of a three- or six-digit hex color. */
export function relativeLuminance(hex: string): number {
  const digits = hex.replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(digits)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const expanded =
    digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(expanded.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Return the WCAG contrast ratio between two hex colors. */
export function contrastRatio(first: string, second: string): number {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort(
    (firstValue, secondValue) => secondValue - firstValue,
  );
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}
