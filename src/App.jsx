import { useState, useEffect } from 'react';
import { COMPOUNDS } from './data/compounds';
import { normalize, molarMass, isValidFormula } from './utils/formula';
import { fetchByFormula } from './utils/pubchem';
import './App.css';

const EXAMPLES = ['H2O', 'NaCl', 'C2H6O', 'Ca(OH)2', 'C6H12O6'];

// Shows digits as subscripts: "H2O" -> H₂O
function Formula({ text }) {
  return text.split(/(\d+)/).map((part, i) => (i % 2 ? <sub key={i}>{part}</sub> : part));
}

// Case-sensitive on purpose: CO (carbon monoxide) and Co (cobalt) are different things.
// Local list first; any other valid formula goes to PubChem.
function lookup(raw) {
  const f = normalize(raw);
  if (!f) return { status: 'empty' };
  const matches = COMPOUNDS.filter((c) => c.formula === f);
  if (matches.length) {
    return { status: 'found', f, mass: molarMass(f), matches };
  }
  if (!isValidFormula(f)) return { status: 'invalid', f };
  return { status: 'online', f };
}

export default function App() {
  const [input, setInput] = useState('');
  const result = lookup(input);

  const [online, setOnline] = useState({ state: 'idle', items: [] });
  const target = result.status === 'online' ? result.f : '';

  useEffect(() => {
    if (!target) { setOnline({ state: 'idle', items: [] }); return; }
    const ctrl = new AbortController();
    setOnline({ state: 'loading', items: [] });
    const t = setTimeout(async () => {
      try {
        const items = await fetchByFormula(target, ctrl.signal);
        setOnline({ state: items.length ? 'done' : 'none', items });
      } catch (e) {
        if (e.name !== 'AbortError') setOnline({ state: 'error', items: [] });
      }
    }, 500);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [target]);

  return (
    <main className="app">
      <h1>Chemical Formula Namer</h1>
      <p className="intro">Type a formula to see its name. Subscripts like H₂O work too.<br/> <span style={{color:'red'}}>Case-Sensitive: CO is carbon monoxide, Co is cobalt.</span></p>

      <label htmlFor="formula">Formula</label>
      <input
        id="formula"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g. H2O"
        autoComplete="off"
        spellCheck="false"
      />

      <div className="chips" aria-label="Examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip" onClick={() => setInput(ex)}>
            <Formula text={ex} />
          </button>
        ))}
      </div>

      <section aria-live="polite" className="results">
        {result.status === 'invalid' && (
          <p className="note error">
            “{result.f}” isn't a valid formula. Formulas are case-sensitive: each element
            starts with a capital letter (Co = cobalt, CO = carbon monoxide). Check the
            letters and brackets, and try one of the examples above.
          </p>
        )}
        {result.status === 'online' && (
          <>
            {online.state === 'loading' && <p className="note">Searching PubChem…</p>}
            {online.state === 'error' && <p className="note error">Couldn't reach PubChem. Check your internet.</p>}
            {online.state === 'none' && (
              <p className="note error">No compound found for <Formula text={result.f} />.</p>
            )}
            {online.state === 'done' && (
              <>
                <p className="note">From PubChem (showing up to {online.items.length}):</p>
                <div className="cards">
                  {online.items.map((p) => (
                    <article key={p.CID} className="card">
                      <h2>{p.Title}</h2>
                      <p className="formula"><Formula text={p.MolecularFormula} /></p>
                      {p.IUPACName && <p>IUPAC: {p.IUPACName}</p>}
                      {p.synonyms?.length > 0 && <p>Also known as: {p.synonyms.join(', ')}</p>}
                      <p>Type: {p.type} (estimated)</p>
                      <p>Molar mass: {Number(p.MolecularWeight).toFixed(2)} g/mol</p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {result.status === 'found' && (
          <>
            {result.matches.length > 1 && (
              <p className="note">{result.matches.length} compounds share this formula:</p>
            )}
            <div className="cards">
            {result.matches.map((c) => (
              <article key={c.name} className="card">
                <h2>{c.name}</h2>
                <p className="formula"><Formula text={c.formula} /></p>
                {c.common && <p>Also known as: {c.common}</p>}
                <p>Type: {c.type}</p>
                {result.mass !== null && <p>Molar mass: {result.mass.toFixed(2)} g/mol</p>}
              </article>
            ))}
            </div>
          </>
        )}
      </section>
    </main>
    
  );
}
