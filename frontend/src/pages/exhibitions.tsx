import React, { useEffect, useState } from 'react';
import client from '../components/apollo/client';
import { Artist } from '../models/artist.model';
import GET_ARTISTS from '../queries/artists';
import ArtistsComponent from '../components/artists/artist';
import SmallHeadingComponent from '../components/heading/small.heading';
import NavigationComponent from '../components/navigation/navigation';
import { useParams } from 'react-router-dom';
import GET_EXHIBITIONS_BY_ARTIST from '../queries/exhibitionsByArtist';
import { Exhibition } from '../models/exhibition.model';
import ExhibitionsComponent from '../components/exhibitions/exhibition.component';

const ExhibitionsPage = () => {

    let { artist } = useParams();
    
    const [artistAndExhibitions, setArtistAndExhibitions] = useState({} as Artist);
    const [loading, setLoading ] = useState(true);

    useEffect(() => {
        client.query({
            query: GET_EXHIBITIONS_BY_ARTIST,
            variables: {
                searchId: artist
            }
        })
        .then(result => {
            setArtistAndExhibitions(result.data.artists[0]);
            setLoading(false);
        });
    }, []);

    return (
        <>
            <React.StrictMode>
                    <NavigationComponent showHeading={ true } />
                {/* wait to load then render exhibition component  */}
                <div className="h-[80px]">{/* distance between header + rest */}
                </div>
                    { !loading  && <ExhibitionsComponent artist={artistAndExhibitions} />}
            </React.StrictMode>
        </>
    );

}

export default ExhibitionsPage;