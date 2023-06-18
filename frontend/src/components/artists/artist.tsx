import React from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import ArtistCardComponent from './artist.card';
import { Exhibition } from '../../models/exhibition.model';

const ArtistsComponent = (props: { artists: Array<Artist>}) => {

        let totalYearCount = new Map<number, number>();
        const width: number = window.innerWidth;
        const chartCount = 6;

        // calculate how much the width of each chart should be to fix
        const chartWidth = width / chartCount;

        props.artists.forEach((artist: Artist) => {
            artist.exhibitedExhibitions?.forEach((exhibition: Exhibition) => {
                const count = totalYearCount.get(exhibition.startdate);
                totalYearCount.set(exhibition.startdate, count ? count + 1 : 1)
            });
        });

        const xExt = d3.extent(Array.from(totalYearCount.keys()));
        const yExt = d3.extent(Array.from(totalYearCount.values()));

        return (
            <div className="flex flex-wrap items-center w-full mt-4">
                {props.artists &&  props.artists.map((artist: Artist, index: number) => {
                    return <ArtistCardComponent artist={artist} key={ index } width={ chartWidth } height={ 150 } yearExtent={ xExt } countExtent={ yExt } />;
                })}
            </div>
        );
};

export default ArtistsComponent;