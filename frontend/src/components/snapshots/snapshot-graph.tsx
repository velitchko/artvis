import React, { useEffect } from 'react';
import { Link } from "react-router-dom";
import _ from 'lodash';
import { colors } from '../../colors/colors';
import client from '../apollo/client';
import GET_ARTIST_BY_DATE from '../../queries/getArtistByDate';
import { useLocation } from 'react-router-dom';
import Cytoscape from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import { easeBackInOut } from 'd3';
import './snapshot.css';
import GET_EXHIBITIONS_BY_DATE from '../../queries/getExhibitionsBydate';
import GET_ARTISTS_BY_IDS from '../../queries/getArtistsByIds';
import { dateRangeService } from '../../services/date-range-selection.service';


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

let artistIds = new Map<string, boolean>();
let artistLinkIds = new Map<string, boolean>();

const SnapshotGraph = (props: any) => {
    // const [nodes, setNodes] = React.useState<Array<Node>>(new Array<Node>());
    // const [links, setLinks] = React.useState<Array<Link>>(new Array<Link>());

    const [elements, setElements] = React.useState<any>(new Array<any>());

    const [loading, setLoading] = React.useState<boolean>(true);

    const [dateRange, setDateRange] = React.useState<any>();

    const { state } = useLocation();
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

    dateRangeService.getData().subscribe((dateRange: any) => {
        setDateRange(dateRange.value);
        setLoading(true);
    });


    useEffect(() => {

        var startDate = dateRange ? dateRange.startDate.getFullYear() : 1914;
        var endDate = dateRange ? dateRange.endDate.getFullYear() : 1914;

        client.query({ query: GET_EXHIBITIONS_BY_DATE, variables: { startDate: startDate, endDate: endDate } }).then((result: any) => {
            if (!loading) return;
            setLoading(false);
            let artistIdsMap = new Map<string, boolean>();

            result.data.exhibitions.forEach((exhibition: any) => {
                exhibition.artistsExhibited.forEach((artist: any) => {
                    if (!artistIdsMap.has(artist.id)) {
                        artistIdsMap.set(artist.id, true);
                    }
                });
            });

            client.query({
                query: GET_ARTISTS_BY_IDS, variables: { startDate: startDate, endDate: endDate, artistIds: Array.from(artistIdsMap.keys()) }
            }).then((result: any) => {
                if (!loading) return;

                setLoading(false);

                let artistNodes = new Array<Node>();
                let artistLinks = new Array<Link>();
                artistIds = new Map<string, boolean>();
                artistLinkIds = new Map<string, boolean>();

                result.data.artists.forEach((element: any) => {

                    if (element.artistsExhibitedWith.length === 0) {
                        return;
                    }

                    addArtistNode(artistNodes, element);

                    element.artistsExhibitedWith.map((artist: any) => {
                        addArtistNode(artistNodes, artist);
                        addArtistLinkNode(element.id, artist.id, artistLinks);
                    });
                });

                setElements({
                    nodes: artistNodes.map((node: Node) => { return { data: { id: node.id, label: node.name } }; }),
                    edges: artistLinks.map((link: Link) => { return { data: { source: link.sourceId, target: link.targetId, label: 'x' } }; })
                });
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

export default SnapshotGraph;


function createGraph() {

}

function addArtistNode(artistNodes: Array<Node>, artistNode: any) {

    if (artistIds.has(artistNode.id)) {
        return;
    }

    artistNodes.push({ name: artistNode.firstname + ' ' + artistNode.lastname, type: artistNode.__typename, id: artistNode.id });
    artistIds.set(artistNode.id, true);
}

function addArtistLinkNode(sourceId: String, targetId: String, artistLinks: any) {

    var combinedId = "source:" + sourceId + "-target:" + targetId;

    if (artistLinkIds.has(combinedId)) {
        return;
    }

    artistLinks.push({ sourceId: sourceId, targetId: targetId, props: { stroke: '#000' } });
    artistLinkIds.set(combinedId, true);
}
