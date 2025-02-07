import { gql } from '@apollo/client';

const GET_EXHIBITIONS_BY_ARTIST = gql`
query Artists($searchId: String!) {
    artists(where: { id: $searchId }) {
      exhibitedExhibitions {
        id
        startdate
        title
        type
        tookPlaceAtLocations  {
          country
          id
          name
          place
          type
          place_tgn
          locatedAtGeonames {
            latitude
            longitude
            name
            country_code
          }
        }
        itemsWasExhibitedAt {
          id,
            artistsCreated {
              id
            }
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