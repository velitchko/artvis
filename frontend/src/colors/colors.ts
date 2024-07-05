import * as d3 from 'd3';

export const colors = new Map<string, string>([
    ['Artist', 'bg-red-400'],
    ['Location', 'bg-amber-400'],
    ['Venue', 'bg-green-400'],
    ['Organizing Body', ''],
    ['Exhibition', 'bg-indigo-400'],
    // other types
]);

export const countryColors = new Map<string, string>([
    ['DE', '#1f77b4'],
    ['FR', '#ff7f0e'],
    ['GB', '#2ca02c'],
    ['IT', '#d62728'],
    ['NL', '#9467bd'],
    ['BE', '#8c564b'],
    ['HU', '#e377c2'],
    ['US', '#7f7f7f'],
    ['AT', '#bcbd22'],
    ['RU', '#17becf'],
    ['\\N', '#d3d3d3'] // unkown
]);

export const sexColors = new Map<string, string>([
    ['M', '#aec6cf'],
    ['F', '#ffb6c1'],
    ['?', '#d3d3d3']
]);

export const livingColors = new Map<string, string>([
    ['alive', '#1b9e77'],
    ['dead', '#d95f02'],
    ['?', '#d3d3d3']
]);

export const ageGroupColors = d3.interpolateRdBu;