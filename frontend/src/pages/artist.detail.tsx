import React, { useEffect, useState } from 'react';
import client from '../components/apollo/client';
import { Artist } from '../models/artist.model';
import GET_ARTIST from '../queries/artist';
import NavigationComponent from '../components/navigation/navigation';
import ArtistDetailComponent from '../components/artists/artist.detail';
import LoadingComponent from '../components/loading/loading';
import { useParams } from 'react-router-dom';

const ArtistDetailPage = () => {
    let resolvedId = BigInt(1);

    let { id } = useParams();
    if (id === undefined) {
        // set id to random number 1-14000
        resolvedId = BigInt(Math.floor(Math.random() * 14000));
    } else {
        resolvedId = BigInt(id);
    }
    
    const [artist, setArtist] = useState(null as unknown as Artist);
    const [loading, setLoading ] = useState(true);
    const [moreLoading, setMoreLoading] = useState(false);
    

    const load = (result: boolean) => {
        console.log("load more", result);
        setMoreLoading(result);
    }

    useEffect(() => {
        client.query({
            query: GET_ARTIST,
            variables: {
                searchId: `${resolvedId}`
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
                { !loading ? (
                    <>
                        <ArtistDetailComponent artist={artist} loadCallback={load}/> 
                        { moreLoading && (
                            <LoadingComponent 
                                overlay={true} 
                                size="large" 
                                showLogo={true}
                            />
                        )}
                    </>
                ) : (
                    <LoadingComponent 
                        overlay={true} 
                        size="large" 
                        showLogo={true}
                    />
                ) }
            </React.StrictMode>
        </>
    );

}

export default ArtistDetailPage;