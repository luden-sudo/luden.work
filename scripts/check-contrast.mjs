import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// WCAG relative luminance, using the actual theme tokens from the stylesheet.
let css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
// Test the default themes, not optional prefers-contrast/media overrides.
for (let start = css.indexOf('@media'); start !== -1; start = css.indexOf('@media')) {
  let end = css.indexOf('{', start) + 1;
  let depth = 1;
  while (depth && end < css.length) {
    if (css[end] === '{') depth++;
    if (css[end] === '}') depth--;
    end++;
  }
  css = css.slice(0, start) + css.slice(end);
}
const luminance = hex => {
  const normalized = hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex;
  const rgb = normalized.slice(1).match(/../g).map(c => parseInt(c, 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const symbolsCSS=readFileSync(new URL('../src/app/apple-interface.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const financeSource=readFileSync(new URL('../src/components/aurum-app.tsx',import.meta.url),'utf8');
const tones=Function('PROJECT_CATEGORY','return '+financeSource.match(/const categoryTones:[^=]+ = (\{[^\n]+\});/)[1])('Trabajo Hacoo');
for(const match of financeSource.matchAll(/const (?:expenseCategories|incomeCategories) = (\[[^\n]+\]);/g))for(const category of JSON.parse(match[1]))assert.ok(tones[category],`Missing symbol color for ${category}`);
for (const theme of ['dark', 'light']) {
  const tokens = {};
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!rule[1].split(',').some(selector => selector.trim() === `:root[data-theme="${theme}"]`) || !rule[2].includes('--')) continue;
    for (const pair of rule[2].matchAll(/(--[\w-]+):([^;}]*)/g)) tokens[pair[1]] = pair[2].trim();
  }
  const checks = [];
  for (const bg of ['--surface', '--canvas', '--field', '--soft']) {
    for (const fg of ['--ink', '--muted', '--green', '--danger']) checks.push([fg, bg, 4.5]);
    checks.push(['--control-border', bg, 3], ['--focus', bg, 3]);
  }
  checks.push(['--info-text', '--info-bg', 4.5], ['--danger', '--danger-bg', 4.5], ['#ffffff', '--button-blue', 4.5], ['#ffffff', '--button-hover', 4.5], ['#ffffff', '--hero', 4.5], ['--progress-fill', '--line', 3]);
  for (const [fg, bg, minimum] of checks) {
    const actual = ratio(tokens[fg] || fg, tokens[bg] || bg);
    assert.ok(actual >= minimum, `${theme}: ${fg} / ${bg} = ${actual.toFixed(2)}; expected ${minimum}`);
  }
  const symbols={};
  for(const rule of symbolsCSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const selector=rule[1].trim();if(selector!==':root'&&!(theme==='light'&&selector===':root[data-theme="light"]'))continue;
    for(const pair of rule[2].matchAll(/(--symbol-[\w-]+):(#[a-f0-9]{6})/g))symbols[pair[1]]=pair[2];
  }
  const rgb=hex=>hex.slice(1).match(/../g).map(c=>parseInt(c,16));
  for(const tone of new Set(Object.values(tones))){
    const foreground=symbols[`--symbol-${tone}`];assert.ok(foreground,`Missing ${tone} token`);
    const surface=rgb(tokens['--surface']),mixed='#'+rgb(foreground).map((v,i)=>Math.round(v*.14+surface[i]*.86).toString(16).padStart(2,'0')).join('');
    assert.ok(ratio(foreground,mixed)>=3,`${theme}: ${tone} symbol contrast ${ratio(foreground,mixed).toFixed(2)}`);
  }
  console.log(`${theme}: ${checks.length} contrast checks passed; debt badge ${ratio(tokens['--danger'], tokens['--danger-bg']).toFixed(2)}:1`);
  console.log(`${theme}: ${new Set(Object.values(tones)).size} category symbol colors passed 3:1 graphic contrast.`);
}
