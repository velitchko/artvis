import { gql } from '@apollo/client';

const GET_ARTIST_BY_DATE = gql`
query ArtistsExhibitedWith {
  artists {
    firstname,
    lastname,
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
      firstname,
      lastname,
      id
    }
  }
}
`;

export default GET_ARTIST_BY_DATE;