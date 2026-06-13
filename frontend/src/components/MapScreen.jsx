import { useState } from 'react';
import SafetyGraph from './SafetyGraph';
import { speak, stopSpeaking } from '../lib/speech';

const SEVMETA = {
  red: { label: 'Dangerous', cls: 'red', icon: '!' },
  yellow: { label: 'Use caution', cls: 'amber', icon: '!' },
  green: { label: 'No known issue', cls: 'green', icon: '✓' },
};

export default function MapScreen({ drugs, pairs, summary, loading }) {
  const [selected, setSelected] = useState(null);

  // auto-surface the most serious pair as the default detail
  const hottest = [...pairs].sort((a, b) => rank(b.severity) - rank(a.severity))[0];
  const active = selected || hottest;
  const activeKey = active ? [active.drugA, active.drugB].sort().join('|') : null;

  if (drugs.length < 2) {
    return (
      <div style={{ paddingTop: 40, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Add at least two medications</p>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 8 }}>
          The safety map draws a line the moment two drugs could interact.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p className="eyebrow">Safety map</p>
        <div className="chips">
          {summary.red > 0 && <span className="chip chip--red"><span className="chip__dot" />{summary.red} red</span>}
          {summary.amber > 0 && <span className="chip chip--amber"><span className="chip__dot" />{summary.amber}</span>}
          {summary.green > 0 && <span className="chip chip--green"><span className="chip__dot" />{summary.green}</span>}
        </div>
      </div>

      <div className="card" style={{ padding: 6, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
            Checking live interactions…
          </div>
        )}
        <SafetyGraph drugs={drugs} pairs={pairs} highlightKey={activeKey}
          onSelectPair={(p) => { stopSpeaking(); setSelected(p); }} />
        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-faint)', paddingBottom: 8 }}>
          Tap any colored line for details
        </p>
      </div>

      {active && <DetailCard pair={active} />}
    </div>
  );
}

function DetailCard({ pair }) {
  const meta = SEVMETA[pair.severity] || SEVMETA.green;
  const [spoken, setSpoken] = useState(false);
  const line = `${pair.drugA} and ${pair.drugB}. ${pair.summary} ${pair.action}`;

  function toggleSpeak() {
    if (spoken) { stopSpeaking(); setSpoken(false); }
    else { speak(line); setSpoken(true); }
  }

  return (
    <div className={`card`} style={{ marginTop: 14, padding: 18, borderTop: `3px solid var(--${meta.cls})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span className={`chip chip--${meta.cls}`}><span className="chip__dot" />{meta.label}</span>
        {pair.source === 'live' && (
          <span style={{ fontSize: 10.5, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>● LIVE DATA</span>
        )}
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, textTransform: 'capitalize', marginBottom: 8 }}>
        {pair.drugA} + {pair.drugB}
      </p>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)', marginBottom: 10 }}>{pair.summary}</p>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-soft)', marginBottom: 16 }}>
        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>What to do: </strong>{pair.action}
      </p>
      <button className="btn-ghost" onClick={toggleSpeak} style={{ width: '100%' }}>
        <SpeakerIcon /> {spoken ? 'Stop' : 'Read this aloud'}
      </button>
      {pair.sourceUrl && (
        <a href={pair.sourceUrl} target="_blank" rel="noreferrer"
          style={{ display: 'block', textAlign: 'center', fontSize: 11.5, color: 'var(--teal)', marginTop: 10, textDecoration: 'none' }}>
          Source
        </a>
      )}
    </div>
  );
}

function rank(s) { return { green: 0, yellow: 1, red: 2 }[s] ?? 0; }

function SpeakerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" />
    </svg>
  );
}
