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
import cise from 'cytoscape-cise';

Cytoscape.use(cise);

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
        name: 'circle',
        fit: true, // whether to fit to viewport
        avoidOverlap: true,
        padding: 5, // fit padding
        boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
        animate: false, // whether to transition the node positions
        animationDuration: 500, // duration of animation in ms if enabled
        animationEasing: 'ease-in-out', // easing of animation if enabled
        animateFilter: function () { return false; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
        ready: function () { console.log("layout ready") }, // callback on layoutready
        stop: undefined, // callback on layoutstop
        // transform: function (_: any, position: any ){ return position; } // transform a given node position. Useful for changing flow direction in discrete layouts 
    });

    dateRangeService.getData().subscribe((dateRange: any) => {
        setDateRange(dateRange.value);
        setLoading(true);
    });


    useEffect(() => {
        if (!loading) return;
        setLoading(false);

        var startDate = dateRange ? dateRange.startDate.getFullYear() : 1914;
        var endDate = dateRange ? dateRange.endDate.getFullYear() : 1914;

        let artistNodes = new Array<Node>();
        let artistLinks = new Array<Link>();
        artistIds = new Map<string, boolean>();
        artistLinkIds = new Map<string, boolean>();

        client.query({ query: GET_EXHIBITIONS_BY_DATE, variables: { startDate: startDate, endDate: endDate } }).then((result: any) => {

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

                var artistWithLargeGroups = result.data.artists.filter(x => x.artistsExhibitedWith.length > 50).map(x => x.id);

                result.data.artists.forEach((element: any) => {

                    //Not required to add artist to nodes as he did not exhibit with any other Artist
                    if (element.artistsExhibitedWith.length === 0) {
                        return;
                    }

                    let artistHasLargeNetwork = artistWithLargeGroups.includes(element.id);

                    addArtistNode(artistNodes, element);

                    if (!artistHasLargeNetwork) {
                        element.artistsExhibitedWith.map((artist: any) => {
                            addArtistNode(artistNodes, artist);
                            addArtistLinkNode(element.id, artist.id, artistLinks);
                        });
                    }
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
                pixelRatio={"1"}
                style={{ width: '100vw', height: '100vh' }} />
            }
        </>
    )
};

export default SnapshotGraph;


function addArtistNode(artistNodes: Array<Node>, artistNode: any) {

    if (artistIds.has(artistNode.id)) {
        return;
    }

    artistNodes.push({ name: artistNode.id, type: artistNode.__typename, id: artistNode.id });
    artistIds.set(artistNode.id, true);
}

function addArtistLinkNode(sourceId: String, targetId: String, artistLinks: any) {

    var combinedId = "source:" + sourceId + "-target:" + targetId;
    var reversedCombinedId = "source:" + targetId + "-target:" + sourceId;

    if (artistLinkIds.has(combinedId) || artistLinkIds.has(reversedCombinedId)) {
        return;
    }

    artistLinks.push({ sourceId: sourceId, targetId: targetId, props: { stroke: '#000' } });
    artistLinkIds.set(combinedId, true);
}
