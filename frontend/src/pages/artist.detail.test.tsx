import React, { useEffect, useState } from 'react';
import client from '../components/apollo/client';
import { Artist } from '../models/artist.model';
import GET_ARTIST from '../queries/artist';
import NavigationComponent from '../components/navigation/navigation';
import ArtistDetailComponent from '../components/artists/artist.detail.refactored';
import LoadingComponent from '../components/loading/loading';
import { useParams } from 'react-router-dom';

const ArtistDetailTestPage = () => {
    let resolvedId = BigInt(1);

    let { id } = useParams();
    if (id === undefined) {
        // set id to random number 1-13000
        resolvedId = BigInt(Math.floor(Math.random() * 13000) + 1);
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
                searchId: resolvedId.toString()
            }
        })
        .then(result => {
            setArtist(result.data.artists[0] as Artist);
            setLoading(false);
        })
        .catch(error => {
            console.error('Error loading artist:', error);
            setLoading(false);
        });
    }, [resolvedId]);

    return (
        <>
            <React.StrictMode>
                <NavigationComponent showHeading={ true } />
                {/* Testing indicator */}
                <div className="h-[80px]"></div>
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
                    <p className="font-bold">🧪 Testing Mode</p>
                    <p>This page uses refactored components for testing purposes</p>
                    <p>Artist ID: {resolvedId.toString()}</p>
                </div>
                
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

export default ArtistDetailTestPage;
