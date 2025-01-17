import { gql } from '@apollo/client';


// TODO: calculate age on the fly
const GET_ARTIST = gql`
query Artists ($searchId: String!) { 
    artists(where: { id: $searchId }) {
        firstname, 
        lastname,
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
            firstname,
            lastname,
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
                id
            }  
        }
        coExhibitedTotalArtists {
            firstname,
            lastname,
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
            id
        }
    }
}
`;

export default GET_ARTIST;