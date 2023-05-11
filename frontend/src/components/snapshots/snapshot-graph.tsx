import React, { useEffect } from 'react';
import _ from 'lodash';
import { useLocation } from 'react-router-dom';
import Cytoscape from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import './snapshot.css';
import { dateRangeService } from '../../services/date-range-selection.service';
import axios from 'axios';
import { environment } from '../../../environments/environment';
import GET_ARTIST_EXHIBITED_WITH from '../../queries/cypherQueries/getExhibitedWithArtists';
import { graphControlService } from '../../services/graph-controls.service';
import { emitCustomEvent, useCustomEventListener } from 'react-custom-events';

import cola from 'cytoscape-cola';
import cise from 'cytoscape-cise';

Cytoscape.use(cola);
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

const globalArtistData = new Map<number, any>();

const SnapshotGraph = (props: any) => {
    // const [nodes, setNodes] = React.useState<Array<Node>>(new Array<Node>());
    // const [links, setLinks] = React.useState<Array<Link>>(new Array<Link>());

    var isSnapshot = props.isSnapshot;

    var cyRef;

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

    if (!isSnapshot) {
        useCustomEventListener('CREATE_SNAPSHOT', (snapshotData: any) => {
            var imageBase64Url = cyRef.png();
            var data = {
                imageUrl: imageBase64Url,
                artistLinkIds: new Map(globalArtistData.get(0).artistLinkIds),
                artistNodes: Array.from(globalArtistData.get(0).artistNodes),
                persistedEdges: Array.from(globalArtistData.get(0).persistedEdges),
                artistIds: new Map(globalArtistData.get(0).artistIds),
                creationDate: new Date(),
                name: snapshotData.snapshotName
            }

            emitCustomEvent('SNAPSHOT_CREATED', data);
        });
        dateRangeService.getData().subscribe((dateRange: any) => {
            setDateRange(dateRange.value);
            setLoading(true);
        });
    } else {
        useCustomEventListener('LOAD_SNAPSHOT', (snapshotData: any) => {
            setLoading(false);
            let artistData = {
                persistedEdges: snapshotData.persistedEdges,
                artistLinkIds: snapshotData.artistLinkIds,
                artistNodes: snapshotData.artistNodes,
                artistIds: snapshotData.artistIds
            };

            globalArtistData.set(props.id, artistData);

            let edges = [];

            artistData.persistedEdges.forEach(sourceNodeId => {
                var links = globalArtistData.get(props.id).artistLinkIds.get(sourceNodeId).map((targetId) => { return { group: 'edges', data: { source: sourceNodeId, target: targetId, label: 'artistconnection-' + sourceNodeId } }; })
                edges = edges.concat(links);
            });


            setElements({
                nodes: globalArtistData.get(props.id).artistNodes.map((node: Node) => { return { data: { id: node.id, label: node.name } }; }),
                edges: edges
            });
        })
    }

    graphControlService.getData().subscribe((graphControls: any) => {

        if (!cyRef || !globalArtistData.has(props.id))
            return;

        let layout = cyRef.layout({
            name: graphControls.value.layout
        });

        if (graphControls.value.layout === "cola") {
            // var sourceNodeIds = Array.from(globalArtistData.get(props.id).artistLinkIds.keys());
            // sourceNodeIds.forEach((sourceNodeId: any) => {
            //     toggleEdgesforNode(sourceNodeId, props.id);
            //     addEdgesOnHover(sourceNodeId, props.id);
            // });
        }

        layout.run();
    });


    useEffect(() => {
        if (!loading || isSnapshot) return;
        setLoading(false);

        let artistData = {
            persistedEdges: new Array<string>(),
            artistLinkIds: new Map<string, string[]>(),
            artistNodes: new Array<Node>(),
            artistIds: new Map<string, boolean>()
        };

        globalArtistData.set(props.id, artistData);

        var startDate = dateRange ? dateRange.startDate.getFullYear() : 1914;
        var endDate = dateRange ? dateRange.endDate.getFullYear() : 1914;

        globalArtistData.get(props.id).artistNodes = new Array<Node>();
        globalArtistData.get(props.id).artistIds = new Map<string, boolean>();
        globalArtistData.get(props.id).artistLinkIds = new Map<string, string[]>();

        let query = GET_ARTIST_EXHIBITED_WITH.replace("###START_DATE###", startDate);
        query = query.replace("###END_DATE###", endDate);

        var cypherQuery = {
            cypher: query
        }

        axios.post(environment.cypherAPI, cypherQuery)
            .then(response => {

                response.data.forEach((artistPair: any) => {
                    addArtistNode(globalArtistData.get(props.id).artistNodes, artistPair.a1, props.id);
                    addArtistNode(globalArtistData.get(props.id).artistNodes, artistPair.a2, props.id);
                    addArtistLinkNode(artistPair.a1.id, artistPair.a2.id, props.id);
                });

                setElements({
                    nodes: globalArtistData.get(props.id).artistNodes.map((node: Node) => { return { data: { id: node.id, label: node.name } }; }),
                    edges: []
                });
            });
    });


    let toggleEdgesforNode = (sourceNodeId: string, graphId: number) => {

        var indexOfNode = globalArtistData.get(graphId).persistedEdges.indexOf(sourceNodeId);

        if (indexOfNode !== -1) {
            globalArtistData.get(graphId).persistedEdges.splice(indexOfNode, 1);
            removeEdgesOnHover(sourceNodeId, graphId);
        }
        else {
            globalArtistData.get(graphId).persistedEdges.push(sourceNodeId);
        }
    }

    let removeEdgesOnHover = (sourceNodeId: string, graphId: number) => {
        var indexOfNode = globalArtistData.get(graphId).persistedEdges.indexOf(sourceNodeId);
        if (indexOfNode !== -1) {
            return;
        }
        var node = cyRef.$("#" + sourceNodeId);
        var connectedNodes = node.connectedEdges();

        cyRef.remove(connectedNodes);
    }

    let addEdgesOnHover = (sourceNodeId: string, graphId: number) => {
        var links = globalArtistData.get(graphId).artistLinkIds.get(sourceNodeId);

        if (!links) {
            console.log("no connections found");
            return;
        }

        var data = links.map((targetId) => { return { group: 'edges', data: { source: sourceNodeId, target: targetId, label: 'artistconnection-' + sourceNodeId } }; });
        cyRef.add(
            data
        );
    }

    let addArtistNode = (artistNodes: Array<Node>, artistNode: any, graphId: number) => {

        if (globalArtistData.get(graphId).artistIds.has(artistNode.id)) {
            return;
        }

        artistNodes.push({ name: artistNode.firstname + " " + artistNode.lastname, type: artistNode.__typename, id: artistNode.id });
        globalArtistData.get(graphId).artistIds.set(artistNode.id, true);
    }

    let addArtistLinkNode = (sourceId: string, targetId: string, graphId: number) => {

        var targetIds = [targetId];

        if (globalArtistData.get(graphId).artistLinkIds.has(sourceId)) {
            targetIds = targetIds.concat(globalArtistData.get(graphId).artistLinkIds.get(sourceId));
        }

        globalArtistData.get(graphId).artistLinkIds.set(sourceId, targetIds);
    }

    return (
        <>
            {<CytoscapeComponent
                elements={CytoscapeComponent.normalizeElements(elements)}
                cy={(cy) => {
                    cyRef = cy;

                    var id = props.id;

                    cyRef.on("mouseover", "node", function (evt) {
                        var nodeId = evt.target[0]._private.data.id;
                        addEdgesOnHover(nodeId, id);
                    });

                    cyRef.on("mouseout ", "node", function (evt) {
                        var nodeId = evt.target[0]._private.data.id;
                        removeEdgesOnHover(nodeId, id);
                    });

                    cyRef.unbind("click").on("click", "node", function (evt) {
                        var nodeId = evt.target[0]._private.data.id;
                        toggleEdgesforNode(nodeId, id);
                    });

                    cyRef.on('add', 'node', _evt => {
                        cyRef.layout(layout.current).run()
                        cyRef.fit()
                    });


                }}
                layout={layout.current}
                //pixelRatio={"1"}
                style={{ width: '48vw', height: '85vh' }} />
            }
        </>
    );
};

export default SnapshotGraph;
