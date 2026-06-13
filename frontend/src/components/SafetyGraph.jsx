import { useMemo } from 'react';

const SEV = {
  red: { line: '#c2453b', node: '#f6e3e1', stroke: '#c2453b', text: '#8f2f28' },
  yellow: { line: '#c98a1e', node: '#f7ecd6', stroke: '#c98a1e', text: '#8a5e12' },
  green: { line: '#d3ddd8', node: '#ffffff', stroke: '#9fb3ab', text: '#2c6b4e' },
};
const WEIGHT = { red: 3, yellow: 2, green: 1 };

// Lay nodes out on a circle so the graph reads cleanly at any count.
function layout(n, cx, cy, r) {
  if (n === 1) return [{ x: cx, y: cy }];
  const pts = [];
  const start = -Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

export default function SafetyGraph({ drugs, pairs, onSelectPair, highlightKey }) {
  const W = 340, H = 340, cx = W / 2, cy = H / 2;
  const R = drugs.length <= 2 ? 70 : drugs.length <= 4 ? 95 : 110;
  const pos = useMemo(() => layout(drugs.length, cx, cy, R), [drugs.length, R]);

  const index = useMemo(() => {
    const m = new Map();
    drugs.forEach((d, i) => m.set(d.name.toLowerCase(), i));
    return m;
  }, [drugs]);

  // worst severity per node, to tint the node ring
  const nodeSeverity = useMemo(() => {
    const sev = drugs.map(() => 'green');
    const rank = { green: 0, yellow: 1, red: 2 };
    pairs.forEach((p) => {
      const a = index.get(p.drugA.toLowerCase());
      const b = index.get(p.drugB.toLowerCase());
      [a, b].forEach((i) => {
        if (i != null && rank[p.severity] > rank[sev[i]]) sev[i] = p.severity;
      });
    });
    return sev;
  }, [drugs, pairs, index]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Medication interaction map">
      {/* edges first so nodes sit on top */}
      {pairs.map((p, i) => {
        const a = index.get(p.drugA.toLowerCase());
        const b = index.get(p.drugB.toLowerCase());
        if (a == null || b == null) return null;
        const s = SEV[p.severity] || SEV.green;
        const k = [p.drugA, p.drugB].sort().join('|');
        const isHot = p.severity !== 'green';
        const isHi = highlightKey === k;
        const len = Math.hypot(pos[b].x - pos[a].x, pos[b].y - pos[a].y);
        return (
          <line
            key={i}
            x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y}
            stroke={s.line}
            strokeWidth={WEIGHT[p.severity] + (isHi ? 1.5 : 0)}
            strokeDasharray={p.severity === 'yellow' ? '6 5' : len}
            strokeDashoffset={p.severity === 'red' ? len : 0}
            strokeLinecap="round"
            style={{
              cursor: isHot ? 'pointer' : 'default',
              animation: p.severity === 'red' ? `draw-line 0.7s ease forwards` : 'none',
              opacity: isHot ? 1 : 0.7,
            }}
            onClick={() => isHot && onSelectPair?.(p)}
          />
        );
      })}

      {drugs.map((d, i) => {
        const sev = nodeSeverity[i];
        const s = SEV[sev];
        const short = d.name.length > 9 ? d.name.slice(0, 8) + '.' : d.name;
        return (
          <g key={d.name} style={{ animation: `pop 0.3s ease ${i * 0.05}s both` }}>
            <circle cx={pos[i].x} cy={pos[i].y} r="30" fill={s.node} stroke={s.stroke} strokeWidth="2" />
            <text x={pos[i].x} y={pos[i].y - 1} textAnchor="middle" fontSize="11"
              fontWeight="600" fill={s.text} style={{ textTransform: 'capitalize' }}>
              {short}
            </text>
            {d.dosage && (
              <text x={pos[i].x} y={pos[i].y + 12} textAnchor="middle" fontSize="8.5" fill="#8b9a95">
                {d.dosage}
              </text>
            )}
          </g>
        );
      })}

      <style>{`
        @keyframes draw-line { to { stroke-dashoffset: 0; } }
        @keyframes pop { from { opacity: 0; transform: scale(0.6); transform-box: fill-box; transform-origin: center; } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </svg>
  );
}
