import fs from 'fs';
import path from 'path';

const dir = 'apps/web/src/i18n/translations';

function extractKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = [];
  const regex = /"([^"]+)":\s*"([^"]*)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.push({ key: match[1], value: match[2] });
  }
  return keys;
}

const enKeys = extractKeys(path.join(dir, 'en.ts'));
const enKeySet = new Set(enKeys.map(k => k.key));
const enValues = Object.fromEntries(enKeys.map(k => [k.key, k.value]));

console.log('=== English base: ' + enKeys.length + ' keys ===\n');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'en.ts').sort();
const issues = [];

// Keys that are naturally the same across languages
const skipUntranslated = new Set([
  'about.founderName', 'newsletter.placeholder', 'newsletter.emailLabel',
  'breaking.live', 'footer.copyright',
]);

for (const file of files) {
  const lang = file.replace('.ts', '');
  const langKeys = extractKeys(path.join(dir, file));
  const langKeySet = new Set(langKeys.map(k => k.key));
  const langValues = Object.fromEntries(langKeys.map(k => [k.key, k.value]));

  const missing = [...enKeySet].filter(k => !langKeySet.has(k));
  const extra = [...langKeySet].filter(k => !enKeySet.has(k));

  const untranslated = langKeys.filter(k => {
    if (skipUntranslated.has(k.key)) return false;
    const enVal = enValues[k.key];
    if (k.value === enVal && enVal && enVal.length > 3) return true;
    return false;
  });

  const empty = langKeys.filter(k => k.value.trim() === '');

  let status = '\u2705';
  if (missing.length > 0 || extra.length > 0 || empty.length > 0) status = '\u274C';
  else if (untranslated.length > 0) status = '\u26A0\uFE0F';

  console.log(status + ' ' + lang.toUpperCase() + ': ' + langKeys.length + ' keys');

  if (missing.length > 0) {
    console.log('  MISSING (' + missing.length + '): ' + missing.join(', '));
    issues.push({ lang, type: 'missing', keys: missing });
  }
  if (extra.length > 0) {
    console.log('  EXTRA (' + extra.length + '): ' + extra.join(', '));
    issues.push({ lang, type: 'extra', keys: extra });
  }
  if (empty.length > 0) {
    console.log('  EMPTY (' + empty.length + '): ' + empty.map(k => k.key).join(', '));
    issues.push({ lang, type: 'empty', keys: empty.map(k => k.key) });
  }
  if (untranslated.length > 0) {
    console.log('  UNTRANSLATED (' + untranslated.length + '): ' + untranslated.map(k => k.key).join(', '));
    issues.push({ lang, type: 'untranslated', keys: untranslated.map(k => k.key) });
  }
}

console.log('\n=== SUMMARY ===');
const missingCount = issues.filter(i => i.type === 'missing').reduce((a, i) => a + i.keys.length, 0);
const extraCount = issues.filter(i => i.type === 'extra').reduce((a, i) => a + i.keys.length, 0);
const emptyCount = issues.filter(i => i.type === 'empty').reduce((a, i) => a + i.keys.length, 0);
const untranslatedCount = issues.filter(i => i.type === 'untranslated').reduce((a, i) => a + i.keys.length, 0);

if (missingCount + extraCount + emptyCount === 0 && untranslatedCount === 0) {
  console.log('All translations are complete and correct!');
} else {
  if (missingCount) console.log('Missing keys: ' + missingCount);
  if (extraCount) console.log('Extra keys: ' + extraCount);
  if (emptyCount) console.log('Empty values: ' + emptyCount);
  if (untranslatedCount) console.log('Possibly untranslated (same as English): ' + untranslatedCount);
}
