import { gql } from '@apollo/client';

const GET_ARTIST_BY_DATE = gql`
query Artists ($searchId: String!) { 
    artists(where: { id: $searchId }) {
        firstname, 
        lastname,
        id
        exhibitedWithArtists {
            firstname,
            lastname
            id
        }
    }
}
`;

export default GET_ARTIST_BY_DATE;