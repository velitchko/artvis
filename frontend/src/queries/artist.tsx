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
        deathdate,
        exhibitedWithArtists {
            firstname,
            lastname,
            id, 
            country,
            sex,
            birthdate,
            deathdate    
        }
    }
}
`;

export default GET_ARTIST;