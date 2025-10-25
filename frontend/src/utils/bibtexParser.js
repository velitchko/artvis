"use strict";
// Minimal BibTeX parser for publications.bib
// Usage: import { parseBibtex } from './bibtexParser';
exports.__esModule = true;
exports.parseBibtex = void 0;

function parseBibtex(bibtexContent) {
    const entries = [];
    // We will manually scan the file to extract entries to correctly handle nested braces
    const len = bibtexContent.length;
    let pos = 0;
    // Field regex supports multi-line field values inside braces (used later)
    const fieldRegex = /(\w+)\s*=\s*\{([\s\S]*?)\}/g;

    while (pos < len) {
        const at = bibtexContent.indexOf('@', pos);
        if (at === -1) break;
        let i = at + 1;
        // read entry type
        const typeMatch = bibtexContent.slice(i).match(/^\s*(\w+)/);
        if (!typeMatch) { pos = i; continue; }
        const entryType = typeMatch[1];
        i += typeMatch.index + typeMatch[0].length - (typeMatch[0].startsWith(' ') ? 0 : 0);
        // move to first '{'
        while (i < len && bibtexContent[i] !== '{') i++;
        if (i >= len || bibtexContent[i] !== '{') { pos = i; continue; }
        i++; // skip '{'
        // read citation key until comma
        let citationKey = '';
        while (i < len && bibtexContent[i] !== ',') { citationKey += bibtexContent[i++]; }
        citationKey = citationKey.trim();
        if (i < len && bibtexContent[i] === ',') i++;

        // now read fields until the matching closing brace for the entry
        let depth = 0;
        const startFields = i;
        while (i < len) {
            const ch = bibtexContent[i];
            if (ch === '{') { depth++; i++; }
            else if (ch === '}') {
                if (depth === 0) { break; } else { depth--; i++; }
            } else { i++; }
        }
        const endFields = i;
        const fields = bibtexContent.slice(startFields, endFields);
        const fullEntry = bibtexContent.slice(at, i + 1);

        const entry = {
            id: citationKey,
            bibtex: fullEntry
        };
        pos = i + 1;

        // Parse fields with a small state machine to handle nested braces and quoted values
        function parseFields(raw) {
            const result = {};
            let i = 0;
            const len = raw.length;
            while (i < len) {
                // skip whitespace and commas/newlines
                while (i < len && /[\s,]/.test(raw[i])) i++;
                if (i >= len) break;

                // read key
                let key = '';
                while (i < len && /[A-Za-z0-9_]/.test(raw[i])) {
                    key += raw[i++];
                }
                key = key.toLowerCase();

                // skip to '='
                while (i < len && raw[i] !== '=') i++;
                if (raw[i] === '=') i++;

                // skip whitespace
                while (i < len && /\s/.test(raw[i])) i++;

                // read value
                let value = '';
                if (raw[i] === '{') {
                    // balanced braces
                    let depth = 0;
                    i++; // skip first '{'
                    while (i < len) {
                        if (raw[i] === '{') { depth++; value += raw[i++]; }
                        else if (raw[i] === '}') {
                            if (depth === 0) { i++; break; } else { depth--; value += raw[i++]; }
                        } else { value += raw[i++]; }
                    }
                    // trim possible trailing comma
                    if (value.endsWith(',')) value = value.slice(0, -1);
                } else if (raw[i] === '"') {
                    // quoted string
                    i++; // skip quote
                    while (i < len && raw[i] !== '"') { value += raw[i++]; }
                    if (raw[i] === '"') i++;
                } else {
                    // bare value until comma or newline
                    while (i < len && raw[i] !== ',') { value += raw[i++]; }
                }

                // Trim whitespace and trailing commas/newlines
                value = value.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');

                if (key) result[key] = value;
            }
            return result;
        }

    const parsedFields = parseFields(fields);
    // attach parsed raw fields for diagnostics
    entry._fields = parsedFields;
        // assign parsed fields to entry
        if (parsedFields.title) entry.title = parsedFields.title.replace(/^\{+|\}+$/g, '').trim();
        if (parsedFields.author) entry.authors = parsedFields.author.split(' and ').map(function (a) {
            const parts = a.trim().split(',');
            if (parts.length > 1) {
                return `${parts[0].trim()}, ${parts[1].trim()[0]}.`;
            }
            const names = a.trim().split(' ');
            if (names.length > 1) {
                return `${names[names.length - 1]}, ${names[0][0]}.`;
            }
            return a.trim();
        });
        if (parsedFields.year) entry.year = parseInt(parsedFields.year);
        if (parsedFields.journal) entry.venue = parsedFields.journal;
        if (parsedFields.booktitle) entry.venue = parsedFields.booktitle;
        if (parsedFields.venue) entry.venue = parsedFields.venue;
        if (parsedFields.doi) { entry.doi = parsedFields.doi; entry.url = `https://doi.org/${parsedFields.doi}`; }

        // Type inference
        const typeMap = {
            'article': 'Journal',
            'inproceedings': 'Conference',
            'incollection': 'Book Chapter',
            'misc': 'Preprint'
        };
        entry.type = typeMap[entryType.toLowerCase()] || 'Conference';

        // Attach a list of missing required fields (for diagnostics)
        const missing = [];
        if (!entry.title) missing.push('title');
        if (!entry.authors || !Array.isArray(entry.authors) || entry.authors.length === 0) missing.push('authors');
        if (!entry.venue) missing.push('venue');
        if (!entry.year) missing.push('year');
        entry._missing = missing;

        // Only push if required fields are present
        if (missing.length === 0) {
            entries.push(entry);
        } else {
            // still push entries with missing fields for diagnostics, but flagged
            entries.push(entry);
        }
    }
    return entries;
}
exports.parseBibtex = parseBibtex;
