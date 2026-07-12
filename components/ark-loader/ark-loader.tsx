import React from "react";

type ArkLoaderProps = {
  /** Pixel size of the loader (width = height). Default 64 */
  size?: number;
  /** Stroke color. Default black */
  color?: string;
  className?: string;
  /** Accessible label announced to screen readers */
  label?: string;
};

/**
 * ARK Forecasting loading animation.
 * The logo's strokes continuously draw in and out — no rotation.
 */
export function ArkLoader({
  size = 64,
  color = "#000",
  className,
  label = "Loading",
}: ArkLoaderProps) {
  return (
    <div role="status" aria-label={label} className={className}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          stroke={color}
          strokeWidth={6}
          strokeDasharray="100"
          pathLength={100}
        >
          <path className="ark-stroke" d="M 16 90 L 50 14 L 84 90" />
          <path
            className="ark-stroke"
            style={{ animationDelay: "0.2s" }}
            d="M 28 90 L 50 41 L 72 90"
          />
          <path
            className="ark-stroke"
            style={{ animationDelay: "0.4s" }}
            d="M 38 68 L 74 68"
          />
        </g>
      </svg>
      <style>{`
        .ark-stroke {
          animation: ark-draw 2s ease-in-out infinite;
          stroke-dashoffset: 100;
        }
        @keyframes ark-draw {
          0%   { stroke-dashoffset: 100; }
          55%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ark-stroke { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default ArkLoader;
