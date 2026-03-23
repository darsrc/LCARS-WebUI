import {
  getSeismographicSharedRailLabels,
  type SeismographicMapPayload,
  type SeismographicSceneSpec,
  type SeismographicWaveformPayload,
} from "./seismographicFamilyData";
import { LcarsSvgElbow } from "../primitives/lcarsElbowPrimitives";
import { LcarsSvgFrame } from "../primitives/lcarsChartFramePrimitives";
import { buildFrameStartTitleSpec } from "../primitives/lcarsStrictTitlePrimitives";
import { LcarsSvgSegmentRun, LcarsSvgTextRows } from "../primitives/lcarsSharedScaffoldPrimitives";
import { Phase14SceneSurface } from "./phase14Primitives";

interface SeismographicFamilySceneProps {
  scene: SeismographicSceneSpec;
}

const LEFT_RAIL_TEXT = getSeismographicSharedRailLabels();

const WaveformPayload = ({ payload }: { payload: SeismographicWaveformPayload }) => {
  const midlineY = payload.frameY + payload.frameHeight / 2 - 18;
  return (
    <g data-phase14-payload="waveform">
      <LcarsSvgFrame
        spec={{
          frame: {
            x: payload.frameX,
            y: payload.frameY,
            width: payload.frameWidth,
            height: payload.frameHeight,
            outlineClassName: "phase14-seismo-frame-outline",
          },
          title: buildFrameStartTitleSpec({
            label: payload.title,
            className: "phase14-seismo-payload-title",
            offsetX: payload.titleX - payload.frameX,
            offsetY: payload.titleY - payload.frameY,
          }),
        }}
      >
        {payload.horizontalGrid.map((offsetY) => (
          <line
            className="phase14-seismo-grid-line"
            key={`horizontal-${offsetY}`}
            x1={payload.frameX}
            x2={payload.frameX + payload.frameWidth}
            y1={payload.frameY + offsetY}
            y2={payload.frameY + offsetY}
          />
        ))}
        {payload.verticalGrid.map((offsetX) => (
          <line
            className="phase14-seismo-grid-line"
            key={`vertical-${offsetX}`}
            x1={payload.frameX + offsetX}
            x2={payload.frameX + offsetX}
            y1={payload.frameY}
            y2={payload.frameY + payload.frameHeight}
          />
        ))}
        <line
          className="phase14-seismo-waveform-axis"
          x1={payload.frameX + 8}
          x2={payload.frameX + payload.frameWidth - 8}
          y1={midlineY}
          y2={midlineY}
        />
        {payload.bursts.map((burst, index) => {
          const x = payload.frameX + burst.x;
          return (
            <g key={`burst-${index}`}>
              <rect
                className="phase14-seismo-waveform-bar"
                height={burst.ampTop}
                opacity={burst.opacity ?? 0.96}
                width={burst.width}
                x={x}
                y={midlineY - burst.ampTop}
              />
              <rect
                className="phase14-seismo-waveform-bar"
                height={burst.ampBottom}
                opacity={burst.opacity ?? 0.96}
                width={burst.width}
                x={x}
                y={midlineY}
              />
            </g>
          );
        })}
        <ellipse
          className="phase14-seismo-terminal-marker"
          cx={payload.terminalMarker.cx}
          cy={payload.terminalMarker.cy}
          rx={payload.terminalMarker.rx}
          ry={payload.terminalMarker.ry}
        />
      </LcarsSvgFrame>
      <g className="phase14-seismo-frame-scale">
        {["2,000", "3,000", "4,000", "5,000", "6,000", "7,000", "8,000", "9,000", "10,000", "11,000", "12,000", "13,000", "14,000"].map(
          (label, index) => (
            <text key={label} x={216 + index * 59} y={736}>
              {label}
            </text>
          ),
        )}
      </g>
      <g className="phase14-seismo-frame-scale phase14-seismo-frame-scale-right">
        {["5.310", "4.310", "3.310", "2.310", "1.310", "0.310"].map((label, index) => (
          <text key={label} x={958} y={361 + index * 55}>
            {label}
          </text>
        ))}
      </g>
    </g>
  );
};

const MapPayload = ({ payload }: { payload: SeismographicMapPayload }) => {
  return (
    <g data-phase14-payload="eruption_map">
      <LcarsSvgFrame
        spec={{
          frame: {
            x: payload.frameX,
            y: payload.frameY,
            width: payload.frameWidth,
            height: payload.frameHeight,
            outlineClassName: "phase14-seismo-map-frame",
          },
          title: buildFrameStartTitleSpec({
            label: payload.title,
            className: "phase14-seismo-payload-title",
            offsetX: payload.titleX - payload.frameX,
            offsetY: payload.titleY - payload.frameY,
          }),
        }}
      >
        <rect className="phase14-seismo-map-water" height={payload.frameHeight} width={payload.frameWidth} x={payload.frameX} y={payload.frameY} />
        <path className="phase14-seismo-map-water-shade" d={payload.waterPath} />
        {payload.terrainLayers.map((layer, index) => (
          <path
            className="phase14-seismo-map-terrain"
            d={layer.path}
            key={`terrain-${index}`}
            opacity={layer.opacity}
          />
        ))}
        {payload.markers.map((marker, index) => (
          <circle
            className="phase14-seismo-map-marker"
            cx={marker.x}
            cy={marker.y}
            fill={marker.color}
            key={`marker-${index}`}
            r={marker.radius}
          />
        ))}
        {payload.labels.map((label) => (
          <g className="phase14-seismo-map-callout" key={label.id}>
            <text x={label.x} y={label.y}>
              {label.label}
            </text>
            <text className="phase14-seismo-map-callout-line" x={label.x} y={label.y + 12}>
              {label.line}
            </text>
            <path
              d={`M ${label.elbowX} ${label.y + 3} H ${label.x > label.elbowX ? label.x - 8 : label.x + 42} V ${label.targetY} H ${label.targetX}`}
            />
          </g>
        ))}
      </LcarsSvgFrame>
    </g>
  );
};

export const SeismographicFamilyScene = ({ scene }: SeismographicFamilySceneProps) => {
  return (
    <Phase14SceneSurface className="phase14-seismographic-scene" familyId={scene.familyId} targetId={scene.targetId} viewBox="0 0 984 750">
      <rect className="phase14-seismo-backdrop" height="750" width="984" x="0" y="0" />

      <rect className="phase14-seismo-left-rail phase14-seismo-left-rail-top" height="77" width="123" x="0" y="0" />
      <rect className="phase14-seismo-left-rail phase14-seismo-left-rail-mid" height="95" width="123" x="0" y="79" />
      <LcarsSvgElbow
        armHorizontal={22}
        armVertical={123}
        className="phase14-seismo-elbow"
        corner="bottom-left"
        height={154}
        innerRadius={74}
        width={413}
        x={0}
        y={79}
      />
      <path
        className="phase14-seismo-elbow-secondary"
        d="M 0 248 H 123 V 248 C 123 248 153 249 181 249 H 415 V 268 H 0 Z"
      />
      <rect className="phase14-seismo-left-rail phase14-seismo-left-rail-lower" height="174" width="123" x="0" y="326" />
      <rect className="phase14-seismo-left-rail phase14-seismo-left-rail-accent" height="40" width="123" x="0" y="501" />
      <rect className="phase14-seismo-left-rail phase14-seismo-left-rail-lower" height="208" width="123" x="0" y="542" />

      {LEFT_RAIL_TEXT.map((label) => (
        <text
          className="phase14-seismo-left-label"
          fill={label.fill}
          key={label.text}
          x={label.x}
          y={label.y}
        >
          {label.text}
        </text>
      ))}

      <text className="phase14-seismo-title" x={scene.titleX} y={scene.titleY}>
        {scene.title}
      </text>
      <LcarsSvgTextRows
        blocks={scene.telemetry.map((block) => ({
          ...block,
          className: "phase14-seismo-telemetry",
        }))}
      />

      <LcarsSvgSegmentRun segments={scene.upperSweep} />
      <LcarsSvgSegmentRun segments={scene.lowerSweep} />

      {scene.payload.kind === "waveform" ? (
        <WaveformPayload payload={scene.payload} />
      ) : (
        <MapPayload payload={scene.payload} />
      )}
    </Phase14SceneSurface>
  );
};
