import React, { useEffect, useState } from 'react';
import client from '../components/apollo/client';
import { Artist } from '../models/artist.model';
import GET_ARTIST from '../queries/artist';
import NavigationComponent from '../components/navigation/navigation';
import ArtistDetailComponent from '../components/artists/artist.detail';
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
    const catchy = [
        'Brushing up on art history... Hold tight!',
        'Uncovering masterpieces... Just a moment!',
        'Painting a picture of data... Almost there!',
        'Dusting off old canvases... Please wait!',
        'Sculpting your results... Hang on!',
        'Restoring the Renaissance... Fetching data!',
        'Channeling our inner art historian... Loading!',
        'Analyzing ancient art... One sec!',
        'Polishing our Monets... Data incoming!',
        'Digging through digital archives... Almost done!'
    ];
    

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
                        { !moreLoading && (
                            <div className='absolute top-0 left-0 z-10 w-full h-full flex items-center justify-center bg-white bg-opacity-50'>
                                <p className='text-4xl text-black'>{catchy[Math.floor(Math.random() * catchy.length)]}</p>
                                <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900'></div>
                            </div>
                        )}
                        <ArtistDetailComponent artist={artist} loadCallback={load}/> 
                    </>
                ) : null }
            </React.StrictMode>
        </>
    );

}

export default ArtistDetailPage;