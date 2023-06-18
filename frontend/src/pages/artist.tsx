import React, { useEffect, useState } from 'react';
import client from '../components/apollo/client';
import { Artist } from '../models/artist.model';
import GET_ARTISTS from '../queries/artists';
import ArtistsComponent from '../components/artists/artist';
import SmallHeadingComponent from '../components/heading/small.heading';
import NavigationComponent from '../components/navigation/navigation';

const ArtistPage = () => {
    
    const [artists, setArtists] = useState(new Array<Artist>());
    const [loading, setLoading ] = useState(true);

    useEffect(() => {
        client.query({
            query: GET_ARTISTS
        })
        .then(result => {
            setArtists(result.data.artists as Array<Artist>);
            setLoading(false);
        });
    }, []);

    return (
        <>
            <React.StrictMode>
                    <NavigationComponent showHeading={ true } />
                {/* wait to load then rneder artists component  */}
                <div className="h-[80px]">
                </div>
                    { !loading && <ArtistsComponent artists={artists} /> }
            </React.StrictMode>
        </>
    );

}

export default ArtistPage;