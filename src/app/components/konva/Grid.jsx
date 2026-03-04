"use client";
import { Line } from "react-konva";

export default function Grid({ width, height, gridSize = 40, theme = "light" }) {
  const stroke = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const boldStroke = theme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)";

  const lines = useMemo(() => {
    const items = [];

    for (let x = 0; x <= width; x += gridSize) {
      const isBold = x % (gridSize * 5) === 0;
      items.push(
        <Line
          key={`vx-${x}`}
          points={[x, 0, x, height]}
          stroke={isBold ? boldStroke : stroke}
          strokeWidth={1}
          listening={false}
        />
      );
    }

    for (let y = 0; y <= height; y += gridSize) {
      const isBold = y % (gridSize * 5) === 0;
      items.push(
        <Line
          key={`hy-${y}`}
          points={[0, y, width, y]}
          stroke={isBold ? boldStroke : stroke}
          strokeWidth={1}
          listening={false}
        />
      );
    }

    return items;
  }, [width, height, gridSize, stroke, boldStroke]);

  return <>{lines}</>;
}