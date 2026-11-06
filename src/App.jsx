import { useState } from 'react';
import { COMPOUNDS } from './data/compounds';
import { normalize, molarMass } from './utils/formula';
import './App.css';

const EXAMPLES = ['H2O', 'NaCl', 'C2H6O', 'Ca(OH)2', 'C6H12O6'];

// Shows digits as subscripts: "H2O" -> H₂O
function Formula({ text }) {
  return text.split(/(\d+)/).map((part, i) => (i % 2 ? <sub key={i}>{part}</sub> : part));
}

// Exact capitals are tried first; if nothing matches, capitals are ignored (h2o -> H2O).
function lookup(raw) {
  const f = normalize(raw);
  if (!f) return { status: 'empty' };
  let canonical = f;
  let matches = COMPOUNDS.filter((c) => c.formula === f);
  if (!matches.length) {
    matches = COMPOUNDS.filter((c) => c.formula.toLowerCase() === f.toLowerCase());
    if (matches.length) canonical = matches[0].formula;
  }
  const mass = molarMass(canonical);
  if (mass === null) return { status: 'invalid', f };
  return {
    status: matches.length ? 'found' : 'unknown',
    f, canonical, mass, matches,
    corrected: canonical !== f,
  };
}

export default function App() {
  const [input, setInput] = useState('');
  const result = lookup(input);

  return (
    <main className="app">
      <h1>Chemical Formula Namer</h1>
      <p className="intro">Type a formula to see its name. Subscripts like H₂O work too.</p>

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
            Sorry, we don't have “{result.f}” in our database. Check the letters and brackets,
            and try one of the examples above.
          </p>
        )}
        {result.status === 'unknown' && (
          <p className="note error">
            Sorry, we don't have <Formula text={result.canonical} /> in our database yet.
            (Its molar mass is {result.mass.toFixed(2)} g/mol.)
          </p>
        )}
        {result.status === 'found' && (
          <>
            {result.corrected && (
              <p className="note">Showing results for <Formula text={result.canonical} /></p>
            )}
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
                <p>Molar mass: {result.mass.toFixed(2)} g/mol</p>
              </article>
            ))}
            </div>
          </>
        )}
      </section>
    </main>
    
  );
}
