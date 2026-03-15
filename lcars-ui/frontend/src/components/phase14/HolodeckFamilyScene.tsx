import { LcarsSvgSegmentRun, LcarsSvgTextRows } from "../primitives/lcarsGeometryPrimitives";
import { getHolodeckSceneSpec, type HolodeckSceneSpec } from "./holodeckFamilyData";
import { Phase14Pill, Phase14SceneSurface } from "./phase14Primitives";

interface HolodeckFamilySceneProps {
  scene: HolodeckSceneSpec;
}

const SidebarBars = ({ scene }: { scene: HolodeckSceneSpec }) => {
  return (
    <>
      {scene.leftBars.map((bar) => (
        <g key={`${bar.label}-${bar.y}`}>
          <rect fill={bar.fill} height={bar.height} width={bar.width} x={bar.x} y={bar.y} />
          {bar.accent ? (
            <rect
              fill={bar.accent.fill}
              height={bar.accent.height}
              width={bar.accent.width}
              x={bar.accent.x}
              y={bar.accent.y}
            />
          ) : null}
          <text className="phase14-holodeck-sidebar-label" x={bar.labelX} y={bar.y + bar.height / 2 + 8}>
            {bar.label}
          </text>
        </g>
      ))}
    </>
  );
};

const BadgeColumn = ({ scene }: { scene: HolodeckSceneSpec }) => {
  return (
    <>
      {scene.badges.map((badge) => (
        <g key={`${badge.value}-${badge.y}`}>
          <text className="phase14-holodeck-badge" fill={badge.fill} x={badge.x} y={badge.y}>
            {badge.value}
          </text>
          <rect fill={badge.accentFill} height="34" width="17" x={300} y={badge.y - 34} />
        </g>
      ))}
    </>
  );
};

const DensePayload = ({ scene }: { scene: HolodeckSceneSpec }) => {
  if (scene.payload.kind !== "dense_console") {
    return null;
  }

  return (
    <g data-phase14-payload="dense_console">
      <LcarsSvgTextRows blocks={scene.payload.telemetryBlocks} />
      <LcarsSvgSegmentRun className="phase14-holodeck-accent-square" segments={scene.payload.accentSquares} />
      {scene.payload.centerPills.map((pill) => (
        <Phase14Pill key={`${pill.label}-${pill.y}`} spec={pill} />
      ))}
      {scene.payload.rightPills.map((pill) => (
        <Phase14Pill key={`${pill.label}-${pill.y}`} spec={pill} />
      ))}
    </g>
  );
};

const RosterPayload = ({ scene }: { scene: HolodeckSceneSpec }) => {
  if (scene.payload.kind !== "roster") {
    return null;
  }

  return (
    <g data-phase14-payload="roster">
      {scene.payload.entries.map((entry) => (
        <g key={entry.code}>
          <text className="phase14-holodeck-roster-code" x={414} y={entry.y}>
            {entry.code}
          </text>
          <text className="phase14-holodeck-roster-name" x={582} y={entry.y}>
            {entry.name}
          </text>
        </g>
      ))}
    </g>
  );
};

export const HolodeckFamilyScene = ({ scene }: HolodeckFamilySceneProps) => {
  return (
    <Phase14SceneSurface className="phase14-holodeck-scene" familyId={scene.familyId} targetId={scene.targetId} viewBox="0 0 984 750">
      <rect className="phase14-holodeck-backdrop" height="750" width="984" x="0" y="0" />
      <LcarsSvgSegmentRun segments={scene.scaffoldSegments} />

      <path
        className="phase14-holodeck-cutout"
        d="M 236 79 H 528 V 116 H 314 C 282 116 258 142 258 173 V 196 H 236 Z"
      />
      <path
        className="phase14-holodeck-cutout"
        d="M 241 666 H 321 V 681 H 338 V 708 H 242 C 260 708 274 723 290 735 H 242 C 221 735 204 718 204 697 V 666 Z"
      />

      <text className="phase14-holodeck-title" x={scene.titleX} y={scene.titleY}>
        {scene.title}
      </text>

      {scene.topPills.map((pill) => (
        <Phase14Pill key={`${pill.label}-${pill.y}`} spec={pill} />
      ))}

      <SidebarBars scene={scene} />
      <BadgeColumn scene={scene} />

      {scene.payload.kind === "dense_console" ? (
        <DensePayload scene={scene} />
      ) : (
        <RosterPayload scene={scene} />
      )}

      {scene.footerPills.map((pill) => (
        <Phase14Pill key={`${pill.label}-${pill.x}`} spec={pill} />
      ))}
    </Phase14SceneSurface>
  );
};

export const getHolodeckFamilyScene = (targetId: string) => {
  return getHolodeckSceneSpec(targetId);
};
