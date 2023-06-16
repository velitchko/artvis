import React from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import ArtistCardComponent from './artist.card';
import { Exhibition } from '../../models/exhibition.model';

const ArtistsComponent = (props: { artists: Array<Artist>}) => {

        let totalYearCount = new Map<number, number>();

        props.artists.forEach((artist: Artist) => {
            artist.exhibitedExhibitions?.forEach((exhibition: Exhibition) => {
                const count = totalYearCount.get(exhibition.startdate);
                totalYearCount.set(exhibition.startdate, count ? count + 1 : 1)
            });
        });

        const xExt = d3.extent(Array.from(totalYearCount.keys()));
        const yExt = d3.extent(Array.from(totalYearCount.values()));

        return (
            <div className="flex flex-wrap w-full pt-4">
                {props.artists &&  props.artists.map((artist: Artist, index: number) => {
                    return <ArtistCardComponent artist={artist} key={ index } width={ 250 } height={ 150 } yearExtent={ xExt } countExtent={ yExt } />;
                })}
            </div>
        );
};

export default ArtistsComponent;