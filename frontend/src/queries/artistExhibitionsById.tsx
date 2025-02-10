
import { gql } from '@apollo/client';

const GET_ARTIST_EXHIBITIONS_BY_ID = gql`
query Artists ($searchId: BigInt!) { 
    artists(where: { id: $searchId }) {
        exhibitedAtExhibitions {
            id,
            exhibitsItems {
                artistsCreated {
                    id
                }
            }
        },
    }
}
`;

export default GET_ARTIST_EXHIBITIONS_BY_ID;