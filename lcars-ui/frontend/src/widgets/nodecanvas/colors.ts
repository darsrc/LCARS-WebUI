/** Resolve contract colour names before assigning them to CSS custom properties. */
const GRAPH_COLOR_VAR: Record<string, string> = {
  orange: "var(--okuda-orange)",
  "orange-peel": "var(--okuda-orange)",
  "atomic-tangerine": "var(--okuda-orange)",
  "red-damask": "var(--okuda-orange)",
  bourbon: "var(--okuda-golden)",
  "sandy-brown": "var(--okuda-golden)",
  tanoi: "var(--okuda-golden)",
  "golden-tanoi": "var(--okuda-golden)",
  "pale-canary": "var(--okuda-canary)",
  husk: "var(--okuda-canary)",
  "neon-carrot": "var(--okuda-sunflower)",
  yellow: "var(--okuda-sunflower)",
  blue: "var(--okuda-blue)",
  anakiwa: "var(--okuda-blue)",
  "blue-bell": "var(--okuda-blue)",
  melrose: "var(--okuda-blue)",
  periwinkle: "var(--okuda-blue)",
  "dodger-pale": "var(--okuda-blue)",
  "dodger-soft": "var(--okuda-blue)",
  "near-blue": "var(--okuda-blue)",
  danub: "var(--okuda-mariner)",
  indigo: "var(--okuda-mariner)",
  mariner: "var(--okuda-mariner)",
  "bahama-blue": "var(--okuda-mariner)",
  "navy-blue": "var(--okuda-mariner)",
  purple: "var(--okuda-lilac)",
  lilac: "var(--okuda-lilac)",
  eggplant: "var(--okuda-lilac)",
  "lavender-purple": "var(--okuda-lilac)",
  cosmic: "var(--okuda-lilac)",
  hopbush: "var(--okuda-hopbush)",
  "chestnut-rose": "var(--okuda-hopbush)",
  rust: "var(--okuda-hopbush)",
  red: "var(--okuda-red)",
  "medium-carmine": "var(--okuda-red)",
  tamarillo: "var(--okuda-red)",
  white: "var(--okuda-white)",
};

export const graphAccent = (color: string | null | undefined): string | undefined => {
  if (!color) return undefined;
  if (color.startsWith("#")) return color;
  return GRAPH_COLOR_VAR[color];
};
