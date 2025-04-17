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
import GroupsComponent from '../components/groups/groups.component';
import GET_ARTISTS_FOR_GROUPS from '../queries/artistsForGroups';
import GET_EXHIBITIONS_FOR_GROUPS from '../queries/exhibitionsForGroups';

const GroupsPage = () => {

    let { artist } = useParams();

    const [artists, setArtists] = useState({} as Array<Artist>);
    const [exhibitions, setExhibitions] = useState({} as Array<Exhibition>);
    const [artistAndExhibitions, setArtistAndExhibitions] = useState({} as Artist);
    const [loading, setLoading] = useState(true);

    /* const loadArtist = async () => {
        client.query({
            query: GET_ARTISTS_FOR_GROUPS,

        }).then(result => {
            setArtists(result.data.artists);
            setLoading(false);
        });
    };

    const loadExhibitions = async () => {
        client.query({
            query: GET_EXHIBITIONS_FOR_GROUPS,

        }).then(result => {
            setExhibitions(result.data.exhibitions);
            setLoading(false);
        });
    }; */

    useEffect(() => {
        client.query({
            //query: GET_EXHIBITIONS_BY_ARTIST,
            query: GET_ARTISTS_FOR_GROUPS,
            //variables: {
            //    searchId: "1"
            //}
        })
            .then(result => {
                setArtists(result.data.artists);
                setLoading(false);
            });

    }, []);

    /*  useEffect(() => {
         client.query({
             //query: GET_EXHIBITIONS_BY_ARTIST,
             query: GET_EXHIBITIONS_FOR_GROUPS,
             //variables: {
             //    searchId: "1"
             //}
         })
             .then(result => {
                 setExhibitions(result.data.exhibitions);
                 setLoading(false);
             });
 
     }, []); */

    return (
        <>
            <React.StrictMode>
                <NavigationComponent showHeading={true} />
                {/* wait to load then render exhibition component  */}
                <div className="h-[80px]">{/* distance between header + rest */}
                </div>
                {!loading && <GroupsComponent artists={artists} exhibitions={exhibitions} />}
            </React.StrictMode>
        </>
    );

}

export default GroupsPage;