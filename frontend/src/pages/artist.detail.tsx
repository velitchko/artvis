import React, { useEffect, useState } from 'react';
import client from '../components/apollo/client';
import { Artist } from '../models/artist.model';
import GET_ARTIST from '../queries/artist';
import SmallHeadingComponent from '../components/heading/small.heading';
import NavigationComponent from '../components/navigation/navigation';
import ArtistDetailComponent from '../components/artists/artist.detail';
import { useParams } from 'react-router-dom';

const ArtistDetailPage = () => {

    let { id } = useParams();
    if (id === undefined) {
        // set id to random number 1-14000
        id = Math.floor(Math.random() * 14000).toString();
    }
    
    const [artist, setArtist] = useState(null as unknown as Artist);
    const [loading, setLoading ] = useState(true);

    useEffect(() => {
        client.query({
            query: GET_ARTIST,
            variables: {
                searchId: id
            }
        })
        .then(result => {
            setArtist(result.data.artists[0] as Artist);
            setLoading(false);
        });
    }, []);

    return (
        <>
            <React.StrictMode>
                <NavigationComponent showHeading={ true } />
                {/* wait to load then rneder artists component  */}
                <div className="h-[80px]"></div>
                { !loading && 
                    <ArtistDetailComponent artist={artist} /> 
                }
            </React.StrictMode>
        </>
    );

}

export default ArtistDetailPage;