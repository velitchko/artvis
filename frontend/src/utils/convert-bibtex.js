// Node.js script to convert publications.bib to TypeScript array
// Usage: node src/utils/convert-bibtex.js > src/data/publications.ts

const fs = require('fs');
const path = require('path');
const { parseBibtex } = require('./bibtexParser.js');

// Path to BibTeX file
const bibPath = path.resolve(__dirname, '../data/publications.bib');
const bibtexContent = fs.readFileSync(bibPath, 'utf-8');

// Parse BibTeX entries
const publications = parseBibtex(bibtexContent);

// Diagnostics: report how many raw entries and list missing fields per entry
console.error(`Parsed ${publications.length} raw entries from ${bibPath}`);

if (publications.length === 0) {
  console.error('No entries parsed. Is your BibTeX file empty or malformed?');
}

// We'll output all entries but fill defaults for missing fields so the generated
// TypeScript conforms to the Publication type. Keep diagnostics for missing fields.
const mapped = publications.map((pub) => {
  const defaults = {
    id: pub.id || 'unknown',
    title: pub.title || 'Unknown Title',
    authors: (pub.authors && pub.authors.length) ? pub.authors : ['Unknown Author'],
    venue: pub.venue || 'Unknown Venue',
    year: pub.year || new Date().getFullYear(),
    type: pub.type || (pub._fields && (pub._fields.journal ? 'Journal' : (pub._fields.booktitle ? 'Conference' : 'Preprint')) ) || 'Preprint',
    doi: pub.doi,
    url: pub.url,
    bibtex: pub.bibtex || ''
  };
  // attach original _missing so diagnostics can still show what was missing
  defaults._missing = pub._missing || [];
  defaults._fields = pub._fields || {};
  return defaults;
});

const outPath = path.resolve(__dirname, '../data/publications.ts');
const lines = [];
lines.push('import { Publication } from "../models/publication.model";');
lines.push('export const publications: Publication[] = [');
mapped.forEach(pub => {
  lines.push('  {');
  lines.push(`    id: ${JSON.stringify(pub.id)},`);
  lines.push(`    title: ${JSON.stringify(pub.title)},`);
  lines.push(`    authors: [${pub.authors.map(a => JSON.stringify(a)).join(', ')}],`);
  lines.push(`    venue: ${JSON.stringify(pub.venue)},`);
  lines.push(`    year: ${pub.year},`);
  lines.push(`    type: ${JSON.stringify(pub.type)},`);
  if (pub.doi) {
    lines.push(`    doi: ${JSON.stringify(pub.doi)},`);
    lines.push(`    url: ${JSON.stringify(pub.url)},`);
  }
  lines.push(`    bibtex: ${JSON.stringify(pub.bibtex)}`);
  lines.push('  },');
});
lines.push('];');

try {
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
  console.error(`Wrote ${mapped.length} publications to ${outPath}`);
} catch (err) {
  console.error('Failed to write publications.ts:', err);
}

// Print diagnostics of missing fields but do not prevent output
const entriesWithMissing = mapped.filter(p => p._missing && p._missing.length > 0);
if (entriesWithMissing.length > 0) {
  console.error(`Found ${entriesWithMissing.length} entries with missing fields (defaults applied):`);
  entriesWithMissing.forEach((p, i) => {
    console.error(`- [${i + 1}] key=${p.id || 'unknown'} missing=${p._missing.join(', ')}`);
  });
}
