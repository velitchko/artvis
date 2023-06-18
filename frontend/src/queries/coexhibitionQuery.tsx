import { gql } from '@apollo/client';

const GET_COEXHIBITIONS = gql`
query Edges($where1: ArtistWhere, $where2: ArtistExhibitedWithArtistsConnectionWhere) {
    artistsConnection(where: $where1) {
    edges {
        node {
        firstname,
        lastname,
        id,
        exhibitedWithArtistsConnection(where: $where2) {
            edges {
                startdate,
                enddate,
                node {
                    firstname,
                    lastname,
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