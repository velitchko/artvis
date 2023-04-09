import { gql } from '@apollo/client';

const GET_ARTISTS_BY_IDS = gql`
query Artists($artistIds: [String!], $startDate: Int!, $endDate: Int!) {
  artists(where: {

    id_IN: $artistIds,
    artistsExhibitedWithConnection_ALL: {
      edge: {
        AND: [
          {enddate_LTE: $endDate}
          {startdate_GTE: $startDate}
        ]
        
        
      }
    }
  }) {
    id
    artistsExhibitedWith {
      id
    }
  }
}
`;

export default GET_ARTISTS_BY_IDS;