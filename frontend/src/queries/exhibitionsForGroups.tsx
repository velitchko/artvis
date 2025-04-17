import { gql } from '@apollo/client';

const GET_EXHIBITIONS_FOR_GROUPS = gql`
query Exhibitions { 
    exhibitions {
        id,
        exhibitsItems {
            artistsCreated {
                id
            }
        }
               
    }
}
`;

// (options: { limit: 100 })

export default GET_EXHIBITIONS_FOR_GROUPS;