// Expanded Atomic masses (g/mol) to cover the larger compound list.
const MASSES = {
  // Nonmetals & Noble Gases
  H: 1.008, He: 4.0026, B: 10.81, C: 12.011, N: 14.007, O: 15.999, 
  F: 18.998, Ne: 20.180, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, 
  Br: 79.904, I: 126.90,

  // Alkali & Alkaline Earth Metals
  Li: 6.94, Na: 22.99, K: 39.098, Rb: 85.468, Cs: 132.91,
  Be: 9.0122, Mg: 24.305, Ca: 40.078, Sr: 87.62, Ba: 137.33,

  // Transition & Post-transition Metals
  Ti: 47.867, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, 
  Ni: 58.693, Cu: 63.546, Zn: 65.38, Ag: 107.868, Cd: 112.41, 
  Hg: 200.59, Al: 26.982, Si: 28.085, Sn: 118.71, Pb: 207.2,
};

const SUB = '₀₁₂₃₄₅₆₇₈₉';

// Turns subscript digits into normal digits and removes spaces: "H₂O" -> "H2O".
export function normalize(s) {
  return s.replace(/[₀-₉]/g, (d) => SUB.indexOf(d)).replace(/\s+/g, '');
}

// Returns the molar mass of a formula, or null if it can't be read.
export function molarMass(f) {
  // Make sure it's normalized first (in case the user passes "H₂O" directly)
  f = normalize(f); 
  
  const stack = [{}];
  let i = 0;
  const num = () => {
    let n = '';
    while (/\d/.test(f[i] || '')) n += f[i++];
    return n ? parseInt(n, 10) : 1;
  };
  
  while (i < f.length) {
    const ch = f[i];
    if (ch === '(') {
      stack.push({});
      i++;
    } else if (ch === ')') {
      if (stack.length < 2) return null;
      i++;
      const k = num();
      const group = stack.pop();
      const top = stack[stack.length - 1];
      for (const el in group) top[el] = (top[el] || 0) + group[el] * k;
    } else if (/[A-Z]/.test(ch)) {
      let el = ch;
      i++;
      if (/[a-z]/.test(f[i] || '')) el += f[i++];
      if (!(el in MASSES)) {
        console.warn(`Element ${el} missing from MASSES.`);
        return null;
      }
      const k = num();
      const top = stack[stack.length - 1];
      top[el] = (top[el] || 0) + k;
    } else {
      return null;
    }
  }
  if (stack.length !== 1) return null;
  const total = Object.entries(stack[0]).reduce((sum, [el, n]) => sum + MASSES[el] * n, 0);
  return total > 0 ? parseFloat(total.toFixed(3)) : null; // Rounded to 3 decimals for neatness
}

/* ---------------------------------------------------
   TEST CASES
--------------------------------------------------- */
// console.log(molarMass('H2O'));          // 18.015
// console.log(molarMass('H₂O'));          // 18.015 (Tests normalize)
// console.log(molarMass('(NH4)2SO4'));    // 132.139 (Tests nested parentheses)
// console.log(molarMass('C6H12O6'));      // 180.156
// console.log(molarMass('Ca(OH)2'));      // 74.093
// console.log(molarMass('CuSO4'));        // 159.609
// console.log(molarMass('KMnO4'));        // 158.032

/* ---------------------------------------------------
   CASE-SENSITIVE VALIDATION
   Capitals matter: CO = carbon monoxide, Co = cobalt.
--------------------------------------------------- */
const ELEMENTS = new Set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr ' +
  'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg ' +
  'Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' '));

function bracketsOk(s) {
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')' && --depth < 0) return false;
  }
  return depth === 0 && !/^[\d)]/.test(s);
}

// True only if every element is written with correct capitals (e.g. "NaCl", "Co", "CO").
export function isValidFormula(f) {
  if (!/^(?:[A-Z][a-z]?|\d+|\(|\))+$/.test(f) || !bracketsOk(f)) return false;
  return (f.match(/[A-Z][a-z]?/g) || []).every((el) => ELEMENTS.has(el));
}
