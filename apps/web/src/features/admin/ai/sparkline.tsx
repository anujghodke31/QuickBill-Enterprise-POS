/**
 * History (28 days, solid ink-faint) followed by forecast (14 days, dashed teal),
 * with a tick where today falls. Drawn in SVG to stay light inside table rows.
 */
export function DemandSparkline({
  history,
  forecast,
  width = 112,
  height = 28,
}: {
  history: number[];
  forecast: number[];
  width?: number;
  height?: number;
}) {
  const all = [...history, ...forecast];
  const max = Math.max(1, ...all);
  const step = width / Math.max(1, all.length - 1);
  const y = (v: number) => height - 2 - (v / max) * (height - 4);
  const points = (values: number[], offset: number) =>
    values.map((v, i) => `${((i + offset) * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const todayX = (history.length - 1) * step;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Sold about ${avg(history.slice(-7)).toFixed(1)} a day last week; forecast ${avg(forecast.slice(0, 7)).toFixed(1)} a day`}
      className="shrink-0 overflow-visible"
    >
      <line x1={todayX} x2={todayX} y1={0} y2={height} stroke="#e3e4ea" strokeWidth={1} />
      <polyline
        points={points(history, 0)}
        fill="none"
        stroke="#85839a"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <polyline
        points={points([history.at(-1) ?? 0, ...forecast], history.length - 1)}
        fill="none"
        stroke="#008c99"
        strokeWidth={2}
        strokeDasharray="3 2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
