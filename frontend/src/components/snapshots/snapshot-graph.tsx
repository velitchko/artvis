import React, { useEffect } from 'react';
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
import axios from 'axios';
import { environment } from '../../../environments/environment';
import GET_ARTIST_EXHIBITED_WITH from '../../queries/cypherQueries/getExhibitedWithArtists';
import { graphControlService } from '../../services/graph-controls.service';
import { emitCustomEvent, useCustomEventListener } from 'react-custom-events';

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

let artistNodes = new Array<Node>();
let artistIds = new Map<string, boolean>();
let artistLinkIds = new Map<string, string[]>();
let cyRef;
let persistedEdges = new Array<string>();


const SnapshotGraph = (props: any) => {
    // const [nodes, setNodes] = React.useState<Array<Node>>(new Array<Node>());
    // const [links, setLinks] = React.useState<Array<Link>>(new Array<Link>());

    const [elements, setElements] = React.useState<any>(new Array<any>());

    const [loading, setLoading] = React.useState<boolean>(true);

    const [dateRange, setDateRange] = React.useState<any>();

    const { state } = useLocation();
    const layout = React.useRef<any>({

        animate: true,
        animationDuration: undefined,
        animationEasing: undefined,
        boundingBox: undefined,
        componentSpacing: 40,
        coolingFactor: 0.99,
        fit: true,
        gravity: 1,
        initialTemp: 1000,
        minTemp: 1.0,
        name: 'circle',
        nestingFactor: 1.2,
        nodeDimensionsIncludeLabels: false,
        nodeOverlap: 4,
        numIter: 1000,
        padding: 30,
        position(node) {
            return { row: node.data('row'), col: node.data('col') }
        },
        randomize: true,
        refresh: 20
    });


    useCustomEventListener('CREATE_SNAPSHOT', (snapshotData) => {
        var imageBase64Url = cyRef.png();
        var data = {
            imageUrl: imageBase64Url,
            artistLinkIds: new Map(artistLinkIds),
            artistNodes: Object.assign({}, artistNodes),
            persistedEdges: Object.assign({}, persistedEdges),
            creationDate: new Date()
        }

        emitCustomEvent('SNAPSHOT_CREATED', data);
    })



    dateRangeService.getData().subscribe((dateRange: any) => {
        setDateRange(dateRange.value);
        setLoading(true);
    });

    graphControlService.getData().subscribe((graphControls: any) => {

        let layout = cyRef.layout({
            name: graphControls.value.layout
        });
        layout.run();
    });

    useEffect(() => {
        if (!loading) return;
        setLoading(false);

        var startDate = dateRange ? dateRange.startDate.getFullYear() : 1914;
        var endDate = dateRange ? dateRange.endDate.getFullYear() : 1914;

        artistNodes = new Array<Node>();
        artistIds = new Map<string, boolean>();
        artistLinkIds = new Map<string, string[]>();

        let query = GET_ARTIST_EXHIBITED_WITH.replace("###START_DATE###", startDate);
        query = query.replace("###END_DATE###", endDate);

        var cypherQuery = {
            cypher: query
        }

        axios.post(environment.cypherAPI, cypherQuery)
            .then(response => {

                response.data.forEach((artistPair: any) => {
                    addArtistNode(artistNodes, artistPair.a1);
                    addArtistNode(artistNodes, artistPair.a2);
                    addArtistLinkNode(artistPair.a1.id, artistPair.a2.id);
                });


                setElements({
                    nodes: artistNodes.map((node: Node) => { return { data: { id: node.id, label: node.name } }; }),
                    edges: []
                });
            });
    });

    return (
        <>
            {!loading && <CytoscapeComponent
                elements={CytoscapeComponent.normalizeElements(elements)}
                cy={(cy) => {
                    cyRef = cy;

                    cyRef.on("mouseover", "node", function (evt) {
                        var nodeId = evt.target[0]._private.data.id;
                        addEdgesOnHover(nodeId);
                    });

                    cyRef.on("mouseout ", "node", function (evt) {
                        var nodeId = evt.target[0]._private.data.id;
                        removeEdgesOnHover(nodeId);
                    });

                    cyRef.unbind("click").on("click", "node", function (evt) {
                        var nodeId = evt.target[0]._private.data.id;
                        toggleEdgesforNode(nodeId);
                    });

                    cyRef.on('add', 'node', _evt => {
                        cyRef.layout(layout.current).run()
                        cyRef.fit()
                    });
                }}
                layout={layout.current}
                //pixelRatio={"1"}
                style={{ width: '95vw', height: '85vh' }} />
            }
        </>
    )
};

export default SnapshotGraph;

function toggleEdgesforNode(sourceNodeId: string) {

    var indexOfNode = persistedEdges.indexOf(sourceNodeId);

    if (indexOfNode !== -1) {
        persistedEdges.splice(indexOfNode, 1);
        removeEdgesOnHover(sourceNodeId);
    }
    else {
        persistedEdges.push(sourceNodeId);
    }
}

function removeEdgesOnHover(sourceNodeId: string) {
    var indexOfNode = persistedEdges.indexOf(sourceNodeId);
    if (indexOfNode !== -1) {
        return;
    }
    var node = cyRef.$("#" + sourceNodeId);
    var connectedNodes = node.connectedEdges();

    cyRef.remove(connectedNodes);
}

function addEdgesOnHover(sourceNodeId: string) {
    var links = artistLinkIds.get(sourceNodeId);

    if (!links) {
        console.log("no connections found");
        return;
    }

    var data = links.map((targetId) => { return { group: 'edges', data: { source: sourceNodeId, target: targetId, label: 'artistconnection-' + sourceNodeId } }; });
    cyRef.add(
        data
    );
}

function addArtistNode(artistNodes: Array<Node>, artistNode: any) {

    if (artistIds.has(artistNode.id)) {
        return;
    }

    artistNodes.push({ name: artistNode.firstname + " " + artistNode.lastname, type: artistNode.__typename, id: artistNode.id });
    artistIds.set(artistNode.id, true);
}

function addArtistLinkNode(sourceId: string, targetId: string) {

    var targetIds = [targetId];

    if (artistLinkIds.has(sourceId)) {
        targetIds = targetIds.concat(artistLinkIds.get(sourceId));
    }

    artistLinkIds.set(sourceId, targetIds);
}
