import { gql } from '@apollo/client';

const GET_COEXHIBITIONS = gql`
query Edges($where: ArtistExhibitedWithArtistsConnectionWhere) {
    artistsConnection {
    edges {
        node {
        id,
        exhibitedWithArtistsConnection(where: $where) {
            edges {
                node {
                    id
                }
            }
        }
        }
    }
    }
}`;

// {
//     "where": {
//       "edge": { 
//         "startdate": Integer, GTE/LTE
//         "enddate": Integer, GTE/LTE
//       }
//     }
//   }

export default GET_COEXHIBITIONS;