import { gql } from '@apollo/client';


// TODO: calculate age on the fly
const GET_ARTIST = gql`
query Artists ($searchId: String!) { 
    artists(where: { id: $searchId }) {
        firstname, 
        lastname,
        id,
        country,
        sex,
        birthdate,
        birthplace,
        deathdate,
        deathplace,
        exhibitedWithArtists {
            firstname,
            lastname,
            id, 
            country,
            sex,
            birthdate,
            deathdate,
            birthplace,
            deathplace,
            exhibitedExhibitions {
                title,
                startdate,
                id
            }  
        }
        exhibitedExhibitions {
            title,
            startdate,
            id
        }
    }
}
`;

export default GET_ARTIST;