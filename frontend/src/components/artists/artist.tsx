import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import ArtistCardComponent from './artist.card';
import { Exhibition } from '../../models/exhibition.model';

const ArtistsComponent = (props: { artists: Array<Artist>}) => {

        let totalYearCount = new Map<number, number>();
        // subtract scrollbar width from window width
        const width = window.innerWidth;
        const chartCount = 7;

        const navigate = useNavigate();

        const orders = [{ value: 'name', label: 'alphabetically'}, {value: 'count', label: 'exhibition count'}, {value:'chi', label: 'chi square'}];
        const [order, setOrder] = React.useState('name'); // 'name', 'count', 'chi'
        const [artists, setArtists] = React.useState(new Array<Artist>());

        // calculate how much the width of each chart should be to fix
        const chartWidth = width / chartCount;

        useEffect(() => {
            setArtists(props.artists);
        }, props.artists);


        artists.forEach((artist: Artist) => {
            artist.exhibitedExhibitions?.forEach((exhibition: Exhibition) => {
                const count = totalYearCount.get(exhibition.startdate);
                totalYearCount.set(exhibition.startdate, count ? count + 1 : 1)
            });
        });

        const chiSquare = (x: Array<number>, y: Array<number>) => {
            let chi = 0;
            for(let i = 0; i < x.length; i++) {
                chi += Math.pow(x[i] - y[i], 2) / Math.pow(x[i] + y[i], 2);
            }
            return chi/2;
        }

        const orderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
            setArtists(new Array<Artist>());
            setOrder(event.target.value);
            const reordered = reorder(event.target.value);
            setArtists(reordered)
        }

        const reorder = (order: string): Array<Artist> => {
            let objects = [...artists]; // need a copy here to avoide read-only errors
            switch(order) {
                case 'name':
                    objects.sort((a: Artist, b: Artist) => `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`));
                    break;
                case 'count':
                    objects.sort((a: Artist, b: Artist) => {
                        return a.exhibitedExhibitions && b.exhibitedExhibitions ? a.exhibitedExhibitions.length - b.exhibitedExhibitions.length : 0;
                    });
                    break;
                case 'age':
                    break;
                case 'country': 
                    break;
                case 'chi':  
                    objects.sort((a: Artist, b: Artist) => {
                        const aExhibitions = a.exhibitedExhibitions?.map((exhibition: Exhibition) => exhibition.startdate);
                        const bExhibitions = b.exhibitedExhibitions?.map((exhibition: Exhibition) => exhibition.startdate);
                        const aExhibitionsCount = new Map<number, number>();
                        const bExhibitionsCount = new Map<number, number>();
                        aExhibitions?.forEach((year: number) => {
                            const count = aExhibitionsCount.get(year);
                            aExhibitionsCount.set(year, count ? count + 1 : 1)
                        });
                        bExhibitions?.forEach((year: number) => {
                            const count = bExhibitionsCount.get(year);
                            bExhibitionsCount.set(year, count ? count + 1 : 1)
                        });

                        // fill in missing years from 1905-1915
                        for(let i = 1905; i <= 1915; i++) {
                            if(!aExhibitionsCount.has(i)) {
                                aExhibitionsCount.set(i, 0);
                            }
                            if(!bExhibitionsCount.has(i)) {
                                bExhibitionsCount.set(i, 0);
                            }
                        }

                        const aExhibitionsCountArray = Array.from(aExhibitionsCount.values());
                        const bExhibitionsCountArray = Array.from(bExhibitionsCount.values());

                        const chi = chiSquare(aExhibitionsCountArray, bExhibitionsCountArray);
                        
                        return chi;
                    });
                    break;
                default:
                    break;
            }
            return objects;
        }

        const xExt = d3.extent(Array.from(totalYearCount.keys()));
        const yExt = d3.extent(Array.from(totalYearCount.values()));

        return (
            <div className="flex flex-wrap items-center justify-center w-full"> 
                <div>
                    <select id="lang" onChange={orderChange} value={order}>
                    {
                        orders.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))
                    }
                    </select>
                </div>
                {artists &&  artists.map((artist: Artist) => {
                    return <ArtistCardComponent artist={artist} key={ artist.id } width={ chartWidth } height={ 150 } yearExtent={ xExt } countExtent={ yExt } navigate={ navigate }/>;
                })}
            </div>
        );
};

export default ArtistsComponent;