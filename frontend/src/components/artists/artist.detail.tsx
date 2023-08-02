import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import ArtistCardComponent from './artist.card';
import { Exhibition } from '../../models/exhibition.model';

class ArtistDetailComponent extends React.Component<{ artist: Artist }, { artist: Artist }> {

    private svgContainer: d3.Selection<any, any, any, any> | undefined;
    private xScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScale: d3.ScaleLinear<number, number, never> | undefined;
    private margin: { bottom: number, left: number, right: number, top: number };

    constructor(props: { artist: Artist }) {
        super(props);

        this.state = {
            artist: props.artist
        };

        this.svgContainer = undefined;

        this.xScale = undefined;
        this.yScale = undefined;

        this.margin = {
            top: 20,
            bottom: 20,
            left: 20,
            right: 20
        };
    }

    render() {
        return (
            <>
            </>
        );
    }
};

export default ArtistDetailComponent;