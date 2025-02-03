import * as d3 from 'd3';

export interface Node extends d3.SimulationNodeDatum {
    name: String,
    type: String,
    id: String | number,
    props: any,
};