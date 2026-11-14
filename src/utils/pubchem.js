const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound';

// "(NH4)2SO4" -> "H8N2O4S" (Hill order, which PubChem matches reliably)
export function toHill(f) {
  const stack = [{}];
  let i = 0;
  const num = () => {
    let n = '';
    while (/\d/.test(f[i] || '')) n += f[i++];
    return n ? parseInt(n, 10) : 1;
  };
  while (i < f.length) {
    const ch = f[i];
    if (ch === '(') { stack.push({}); i++; }
    else if (ch === ')') {
      if (stack.length < 2) return null;
      i++;
      const k = num(), g = stack.pop(), top = stack[stack.length - 1];
      for (const e in g) top[e] = (top[e] || 0) + g[e] * k;
    } else if (/[A-Z]/.test(ch)) {
      let el = ch; i++;
      if (/[a-z]/.test(f[i] || '')) el += f[i++];
      const k = num(), top = stack[stack.length - 1];
      top[el] = (top[el] || 0) + k;
    } else return null;
  }
  if (stack.length !== 1) return null;
  const c = stack[0];
  const keys = Object.keys(c).sort();
  const order = c.C
    ? ['C', ...(c.H ? ['H'] : []), ...keys.filter((e) => e !== 'C' && e !== 'H')]
    : keys;
  return order.map((e) => e + (c[e] > 1 ? c[e] : '')).join('') || null;
}

async function getJSON(url, signal) {
  const r = await fetch(url, { signal });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('PubChem ' + r.status);
  return r.json();
}

export async function fetchByFormula(formula, signal) {
  const hill = toHill(formula);
  if (!hill) return [];
  let data = await getJSON(`${BASE}/fastformula/${hill}/cids/JSON?MaxRecords=8`, signal);
  for (let n = 0; data?.Waiting && n < 6; n++) {
    await new Promise((r) => setTimeout(r, 1000));
    data = await getJSON(`${BASE}/listkey/${data.Waiting.ListKey}/cids/JSON`, signal);
  }
  const cids = data?.IdentifierList?.CID?.slice(0, 8);
  if (!cids?.length) return [];
  const props = await getJSON(
    `${BASE}/cid/${cids.join(',')}/property/Title,IUPACName,MolecularFormula,MolecularWeight/JSON`,
    signal
  );
  return props?.PropertyTable?.Properties ?? [];
}
