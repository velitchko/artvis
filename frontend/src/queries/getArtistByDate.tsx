import { gql } from '@apollo/client';

const GET_ARTIST_BY_DATE = gql`
query ArtistsExhibitedWith {
  artists {
    id
    artistsExhibitedWith(where:  
    {
        artistsExhibitedWithConnection_ALL: {
        edge: {
                AND: [
                    {enddate_LTE: 1905}
                    {startdate_GTE: 1905}
                ]
            }
        }
    })
    {
      id
    }
  }
}
`;

export default GET_ARTIST_BY_DATE;