export function Elbow({ variant }: { variant: "top" | "bot" }) {
  return (
    <div className={`lcars-elbow lcars-elbow--${variant}`} aria-hidden="true" />
  );
}
