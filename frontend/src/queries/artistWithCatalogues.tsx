import { gql } from '@apollo/client';


// TODO: calculate age on the fly
const GET_ARTIST_AND_CATALOGUES = gql`
query Artists ($searchId: BigInt!) { 
    artists(where: { id: $searchId }) {
        sortname,
        id,
        country,
        sex,
        birthyear,
        birthplace,
        deathyear,
        deathplace,
        coExhibitedArtists {
            sortname,
            id, 
            country,
            sex,
            birthyear,
            deathyear,
            birthplace,
            deathplace,
            exhibitedAtExhibitions {
                title,
                startyear,
                id
            }  
        }
        exhibitedAtExhibitions {
            title,
            startyear,
            id
            exhibitsItems {  
                artistCreated {
                    id
                }
            }
        }
    }
}
`;

export default GET_ARTIST_AND_CATALOGUES;