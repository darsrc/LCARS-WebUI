import { LcarsSvgSegmentRun, LcarsSvgTextRows } from "../primitives/lcarsGeometryPrimitives";
import { getPeriodicTableSceneSpec, type PeriodicTableSceneSpec } from "./periodicTableFamilyData";
import { Phase14MatrixCell, Phase14SceneSurface } from "./phase14Primitives";

interface PeriodicTableFamilySceneProps {
  scene: PeriodicTableSceneSpec;
}

const SeriesBars = ({ scene }: { scene: PeriodicTableSceneSpec }) => {
  return (
    <>
      {scene.series.map((series) => (
        <g key={`${series.label}-${series.x}-${series.y}`}>
          <rect className="phase14-periodic-series-bar" height="9" width={series.width} x={series.x} y={series.y} />
          {series.label ? (
            <text className="phase14-periodic-series-label" x={series.x + series.width / 2} y={series.y + 22}>
              {series.label}
            </text>
          ) : null}
        </g>
      ))}
    </>
  );
};

export const PeriodicTableFamilyScene = ({ scene }: PeriodicTableFamilySceneProps) => {
  return (
    <Phase14SceneSurface
      className="phase14-periodic-scene"
      familyId={scene.familyId}
      targetId={scene.targetId}
      viewBox="0 0 1476 1080"
    >
      <rect className="phase14-periodic-backdrop" height="1080" width="1476" x="0" y="0" />
      <LcarsSvgSegmentRun segments={scene.topSegments} />
      <LcarsSvgSegmentRun segments={scene.bottomSegments} />
      <text className="phase14-periodic-title" x={scene.titleX} y={scene.titleY}>
        {scene.title}
      </text>
      <g data-phase14-payload="dense_matrix" transform="translate(-26 10) scale(1.44 1.54)">
        <SeriesBars scene={scene} />

        {scene.cells.map((cell) => (
          <Phase14MatrixCell key={`${cell.x}-${cell.y}-${cell.symbol}`} spec={cell} />
        ))}

        <LcarsSvgTextRows blocks={scene.footerCopy} />
      </g>
    </Phase14SceneSurface>
  );
};

export const getPeriodicTableFamilyScene = (targetId: string) => {
  return getPeriodicTableSceneSpec(targetId);
};
