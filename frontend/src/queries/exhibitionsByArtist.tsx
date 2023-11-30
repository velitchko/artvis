import { gql } from '@apollo/client';

const GET_EXHIBITIONS_BY_ARTIST = gql`
query Artists($searchId: String!) {
    artists(where: { id: $searchId }) {
      exhibitedExhibitions {
        id
        startdate
        title
        type
        tookPlaceInHosts {
          country
          id
          latitude
          longitude
          name
          place
          town
          type
          place_tgn
        }
        organizer
      }
      birthdate
      birthplace
      country
      deathdate
      deathplace
      firstname
      lastname
      id
      sex
    }
  } 
`;

export default GET_EXHIBITIONS_BY_ARTIST;