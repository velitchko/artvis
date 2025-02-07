import { gql } from '@apollo/client';


// TODO: calculate age on the fly
const GET_ARTIST = gql`
query Artists ($searchId: BigInt!) { 
    artists(where: { id: $searchId }) {
        sortname,
        id,
        country,
        sex,
        birthdate,
        birthyear,
        birthplace,
        deathdate,
        deathyear,
        deathplace,
        coExhibitedArtists {
            sortname,
            id, 
            country,
            sex,
            birthdate,
            deathdate,
            birthplace,
            deathplace,
            exhibitedAtExhibitions {
                title,
                startdate,
                id,
                startyear
            }  
        }
        coExhibitedTotalArtists {
            sortname,
            id, 
            country,
            sex,
            birthdate,
            deathdate,
            birthplace,
            deathplace
        }
        exhibitedAtExhibitions {
            title,
            startdate,
            id,
            startyear
        }
    }
}
`;

export default GET_ARTIST;