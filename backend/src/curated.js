// Curated fallback interactions.
// Live Firecrawl + Gemini is the primary path. But networks fail on stage, and
// a medical demo must never show a wrong "safe" when it can't reach the source.
// These well-established pairs guarantee the core demo (warfarin + ibuprofen)
// always works, and act as a safety net when the live path errors or times out.

const KEY = (a, b) => [a, b].map((d) => d.trim().toLowerCase()).sort().join('|');

const CURATED = {
  [KEY('warfarin', 'ibuprofen')]: {
    severity: 'red',
    summary:
      'Taking warfarin (a blood thinner) with ibuprofen sharply raises the risk of serious internal bleeding, including in the stomach.',
    action: 'Avoid this combination — talk to a doctor or pharmacist before taking them together.',
  },
  [KEY('warfarin', 'aspirin')]: {
    severity: 'red',
    summary:
      'Combining warfarin with aspirin greatly increases the chance of dangerous bleeding because both reduce the blood\u2019s ability to clot.',
    action: 'Do not combine without a doctor\u2019s explicit direction and monitoring.',
  },
  [KEY('lisinopril', 'ibuprofen')]: {
    severity: 'yellow',
    summary:
      'Ibuprofen can make blood-pressure medicines like lisinopril work less well and, with long-term use, may strain the kidneys.',
    action: 'Occasional use is usually okay, but check with a pharmacist before regular use.',
  },
  [KEY('lisinopril', 'potassium')]: {
    severity: 'yellow',
    summary:
      'Lisinopril can raise potassium levels; adding potassium supplements may push them too high, affecting the heart.',
    action: 'Have potassium levels monitored and ask a doctor before supplementing.',
  },
  [KEY('metformin', 'lisinopril')]: {
    severity: 'green',
    summary: 'No significant interaction is known between metformin and lisinopril; they are commonly prescribed together.',
    action: 'No special action needed.',
  },
  [KEY('atorvastatin', 'metformin')]: {
    severity: 'green',
    summary: 'Atorvastatin and metformin are frequently taken together with no significant known interaction.',
    action: 'No special action needed.',
  },
  [KEY('warfarin', 'bactrim')]: {
    severity: 'red',
    summary:
      'Bactrim (an antibiotic) can strongly boost warfarin\u2019s blood-thinning effect, sharply raising the risk of serious bleeding.',
    action: 'Avoid together unless a doctor is closely monitoring — this pairing is a well-known danger.',
  },
  [KEY('warfarin', 'trimethoprim')]: {
    severity: 'red',
    summary:
      'Trimethoprim (in Bactrim) can strongly increase warfarin\u2019s effect, sharply raising bleeding risk.',
    action: 'Avoid together unless closely monitored by a doctor.',
  },
  [KEY('warfarin', 'fluconazole')]: {
    severity: 'red',
    summary:
      'Fluconazole (an antifungal) raises warfarin levels in the blood and can cause dangerous bleeding.',
    action: 'Requires close medical monitoring — do not combine on your own.',
  },
  [KEY('warfarin', 'naproxen')]: {
    severity: 'red',
    summary:
      'Like other anti-inflammatories, naproxen with warfarin raises the risk of serious stomach and internal bleeding.',
    action: 'Avoid this combination — ask a doctor about a safer pain reliever.',
  },
  [KEY('lisinopril', 'spironolactone')]: {
    severity: 'red',
    summary:
      'Both lisinopril and spironolactone raise blood potassium; together they can push it to dangerous, heart-affecting levels.',
    action: 'Needs regular potassium blood tests — only combine under medical supervision.',
  },
  [KEY('sildenafil', 'nitroglycerin')]: {
    severity: 'red',
    summary:
      'Sildenafil (Viagra) with nitrates like nitroglycerin can cause a sudden, dangerous drop in blood pressure.',
    action: 'Never take together — this combination can be life-threatening.',
  },
  [KEY('simvastatin', 'clarithromycin')]: {
    severity: 'red',
    summary:
      'Clarithromycin raises simvastatin to high levels, which can cause serious muscle damage (rhabdomyolysis).',
    action: 'Avoid together — a doctor may pause the statin during antibiotic treatment.',
  },
  [KEY('metformin', 'ibuprofen')]: {
    severity: 'yellow',
    summary:
      'Long-term or high-dose ibuprofen can affect kidney function, which may raise metformin levels in people with kidney issues.',
    action: 'Occasional use is usually fine; check with a pharmacist for regular use.',
  },
  [KEY('atorvastatin', 'amlodipine')]: {
    severity: 'yellow',
    summary:
      'Amlodipine can modestly raise atorvastatin levels, slightly increasing the chance of muscle side effects.',
    action: 'Usually managed by keeping the statin dose moderate — mention any muscle aches to your doctor.',
  },
  [KEY('sertraline', 'tramadol')]: {
    severity: 'yellow',
    summary:
      'Combining sertraline with tramadol can raise serotonin levels, with a risk of agitation, fast heart rate, or tremor.',
    action: 'Watch for those symptoms and tell your doctor you take both.',
  },
  [KEY('amlodipine', 'lisinopril')]: {
    severity: 'green',
    summary: 'Amlodipine and lisinopril are commonly prescribed together for blood pressure with no significant interaction.',
    action: 'No special action needed.',
  },
  [KEY('atorvastatin', 'lisinopril')]: {
    severity: 'green',
    summary: 'No significant interaction is known between atorvastatin and lisinopril.',
    action: 'No special action needed.',
  },
};

export function curatedInteraction(drugA, drugB) {
  return CURATED[KEY(drugA, drugB)] || null;
}
