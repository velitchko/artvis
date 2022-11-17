import React, { useEffect } from 'react';
import { Link } from "react-router-dom";
import _ from 'lodash';
import { colors } from '../../colors/colors';
import client from '../apollo/client';
import GET_ARTIST from '../../queries/artist';
import { useLocation } from 'react-router-dom';
import Cytoscape from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import { easeBackInOut } from 'd3';

type Node = {
    name: string,
    type: string,
    id: string
};

type Link = {
    sourceId: string,
    targetId: string,
    props: any
};

const NetworkComponent = (props: any) => {
    // const [nodes, setNodes] = React.useState<Array<Node>>(new Array<Node>());
    // const [links, setLinks] = React.useState<Array<Link>>(new Array<Link>());

    const [elements, setElements] = React.useState<any>(new Array<any>());
    
    const [loading, setLoading] = React.useState<boolean>(true);
    
    const { state } = useLocation();
    const value = React.useRef(state.id);
    const layout = React.useRef<any>({
        name: 'concentric',
        fit: true, // whether to fit to viewport
        padding: 5, // fit padding
        boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
        animate: true, // whether to transition the node positions
        animationDuration: 500, // duration of animation in ms if enabled
        animationEasing: 'ease-in-out', // easing of animation if enabled
        animateFilter: function () { return true; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
        ready: undefined, // callback on layoutready
        stop: undefined, // callback on layoutstop
        // transform: function (_: any, position: any ){ return position; } // transform a given node position. Useful for changing flow direction in discrete layouts 
    });

    useEffect(() => {
        client.query({ query: GET_ARTIST, variables: { searchId: value.current } }).then((result: any) => {
            if (!loading) return;

            setLoading(false);

            let artistNodes = new Array<Node>();
            let artistLinks = new Array<Link>();

            artistNodes.push({ name: result.data.artists[0].firstname + ' ' + result.data.artists[0].lastname, type: result.data.artists[0].__typename, id: result.data.artists[0].id });
            result.data.artists[0].exhibitedWithArtists.map((artist: any) => {
                artistNodes.push({ name: artist.firstname + ' ' + artist.lastname, type: artist.__typename, id: artist.id });
                artistLinks.push({ sourceId: result.data.artists[0].id, targetId: artist.id, props: { stroke: '#000' } });
            });

            setElements({
                nodes: artistNodes.map((node: Node) => { return { data: { id: node.id, label: node.name } }; }),
                edges: artistLinks.map((link: Link) => { return { data: { source: link.sourceId, target: link.targetId, label: 'x' } }; })
            });
        });
    });

    return (
        <>
            <h1>Network</h1>
            {!loading && <CytoscapeComponent
                elements={CytoscapeComponent.normalizeElements(elements)}
                layout={layout.current}
                style={{ width: '100vw', height: '100vh' }} />
            }
        </>
    )
};

export default NetworkComponent;