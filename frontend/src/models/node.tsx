import * as d3 from 'd3';

export interface Node extends d3.SimulationNodeDatum {
    name: string,
    type: string,
    id: string | number,
    props: any,
};