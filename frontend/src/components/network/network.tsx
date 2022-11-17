import React from 'react';
import { Link } from "react-router-dom";
import _ from 'lodash';
import { colors } from '../../colors/colors';
import client from '../apollo/client';
import GET_ARTIST from '../../queries/artist';
import { useLocation } from 'react-router-dom';

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
    const [results, setResults] = React.useState<any>();

    const [nodes, setNodes] = React.useState<Array<Node>>(new Array<Node>());
    const [links, setLinks] = React.useState<Array<Link>>(new Array<Link>());

    const { state } = useLocation();

    const value = React.useRef(state.id);
    

    client.query({ query: GET_ARTIST, variables: { searchId: value.current } }).then((result: any) => {
        let artistNodes = new Array<Node>();
        let artistLinks = new Array<Link>();

        artistNodes.push({ name: result.data.artists[0].firstname + ' ' + result.data.artists[0].lastname, type: result.data.artists[0].__typename, id: result.data.artists[0].id });
        result.data.artists[0].exhibitedWithArtists.map((artist: any) => {
            artistNodes.push({ name: artist.firstname + ' ' + artist.lastname, type: artist.__typename, id: artist.id });
            artistLinks.push({ sourceId: result.data.artists[0].id, targetId: artist.id, props: { stroke: '#000' } });
        });
        
        setResults(result.data);
        setNodes(artistNodes);
        setLinks(artistLinks);
    });

    return(
        <>
            <h1>Network</h1>
            <p>
                { 'nodes: ' + nodes.length + ' , links: ' + links.length }
            </p>
            { nodes.map((n: any, index: number) => {
                return(<div key={index}>
                    <span>{n.name}</span>
                </div>)
            })
            }

            { links.map((l: any, index: number) => {
                return(<div key={index}>
                    <span>{l.sourceId} - {l.targetId}</span>
                </div>)
            })
            }
        </>
    )
};

export default NetworkComponent;