function worstFor(name, pairs) {
  const rank = { green: 0, yellow: 1, red: 2 };
  let worst = 'green';
  pairs.forEach((p) => {
    if ([p.drugA, p.drugB].map((d) => d.toLowerCase()).includes(name.toLowerCase())) {
      if (rank[p.severity] > rank[worst]) worst = p.severity;
    }
  });
  return worst;
}

const COLOR = { red: 'var(--red)', yellow: 'var(--amber)', green: 'var(--green)' };

export default function StackScreen({ drugs, pairs, summary, onRemove, onGoScan }) {
  if (drugs.length === 0) {
    return (
      <div style={{ paddingTop: 40, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)' }}>No medications yet</p>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '8px 0 20px' }}>
          Scan a pill bottle to start building this person's safety map.
        </p>
        <button className="btn-primary" onClick={onGoScan}>Scan first bottle</button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p className="eyebrow">Current stack · {drugs.length}</p>
        <div className="chips">
          {summary.red > 0 && <span className="chip chip--red"><span className="chip__dot" />{summary.red} red</span>}
          {summary.amber > 0 && <span className="chip chip--amber"><span className="chip__dot" />{summary.amber} caution</span>}
          {summary.green > 0 && <span className="chip chip--green"><span className="chip__dot" />{summary.green} safe</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {drugs.map((d) => {
          const sev = worstFor(d.name, pairs);
          return (
            <div key={d.name} className="card"
              style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${COLOR[sev]}` }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, textTransform: 'capitalize', color: 'var(--ink)' }}>{d.name}</p>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {[d.dosage, d.frequency].filter(Boolean).join(' · ') || 'No dosage recorded'}
                </p>
              </div>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLOR[sev] }} />
              <button onClick={() => onRemove(d.name)} aria-label={`Remove ${d.name}`}
                style={{ color: 'var(--ink-faint)', padding: 4, lineHeight: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
