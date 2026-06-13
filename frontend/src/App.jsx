import { useEffect, useState, useCallback } from 'react';
import ScanScreen from './components/ScanScreen';
import StackScreen from './components/StackScreen';
import MapScreen from './components/MapScreen';
import { api } from './lib/api';

// Seed stack so a demo never opens on an empty screen.
const SEED = [
  { name: 'metformin', dosage: '500 mg', frequency: '2× daily' },
  { name: 'lisinopril', dosage: '10 mg', frequency: 'daily' },
  { name: 'atorvastatin', dosage: '20 mg', frequency: 'daily' },
];

export default function App() {
  const [tab, setTab] = useState('stack');
  const [drugs, setDrugs] = useState(SEED);
  const [pairs, setPairs] = useState([]);
  const [summary, setSummary] = useState({ red: 0, amber: 0, green: 0 });
  const [loading, setLoading] = useState(false);

  const recheck = useCallback(async (list) => {
    if (list.length < 2) { setPairs([]); setSummary({ red: 0, amber: 0, green: 0 }); return; }
    setLoading(true);
    try {
      const { pairs, summary } = await api.stackCheck(list.map((d) => d.name));
      setPairs(pairs);
      setSummary({ red: summary.red || 0, amber: summary.yellow || 0, green: summary.green || 0 });
    } catch {
      // keep last known state on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { recheck(drugs); }, []); // initial

  function addDrug(d) {
    if (!d?.name) return;
    setDrugs((prev) => {
      if (prev.some((x) => x.name.toLowerCase() === d.name.toLowerCase())) return prev;
      const next = [...prev, d];
      recheck(next);
      return next;
    });
    setTab('map'); // jump to the map so the new line is visible
  }

  function removeDrug(name) {
    setDrugs((prev) => {
      const next = prev.filter((x) => x.name.toLowerCase() !== name.toLowerCase());
      recheck(next);
      return next;
    });
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark">Med<em>Stack</em></span>
        </div>
        <span className="brand__tag">Safety map</span>
      </header>

      <main className="app__body">
        {tab === 'scan' && <ScanScreen onAdd={addDrug} />}
        {tab === 'stack' && (
          <StackScreen drugs={drugs} pairs={pairs} summary={summary}
            onRemove={removeDrug} onGoScan={() => setTab('scan')} />
        )}
        {tab === 'map' && <MapScreen drugs={drugs} pairs={pairs} summary={summary} loading={loading} />}

        <p className="disclaimer">
          MedStack is a prototype, not medical advice. Always confirm with a doctor or pharmacist.
        </p>
      </main>

      <nav className="tabbar">
        <button className={tab === 'scan' ? 'active' : ''} onClick={() => setTab('scan')}>
          <IconCam /> Scan
        </button>
        <button className={tab === 'stack' ? 'active' : ''} onClick={() => setTab('stack')}>
          <IconList /> Stack
        </button>
        <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
          <IconMap /> Map
        </button>
      </nav>
    </div>
  );
}

function IconCam() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4l1.5 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4L9.5 4z" /><circle cx="12" cy="13" r="3.2" /></svg>;
}
function IconList() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
}
function IconMap() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="7" r="2.4" /><circle cx="18" cy="9" r="2.4" /><circle cx="11" cy="18" r="2.4" /><path d="M7.7 8.6l2.6 7.4M16.2 10.6l-3.6 5.6M8 7.4l8 1.4" /></svg>;
}
