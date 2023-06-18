import * as d3 from 'd3';
import { Node } from './node';

export interface Link extends d3.SimulationLinkDatum<Node> {
    sourceId: string,
    targetId: string,
    props: any,
    source: Node,
    target: Node
};