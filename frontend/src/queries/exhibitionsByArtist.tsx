import { gql } from '@apollo/client';

const GET_EXHIBITIONS_BY_ARTIST = gql`
query Artists($searchId: BigInt!) {
    artists(where: { id: $searchId }) {
      id,
      birthyear,
      birthplace,
      country,
      deathyear,
      deathplace,
      sortname,
      sex,
      exhibitedAtExhibitions {
        id,
        startyear,
        title,
        type,
        tookPlaceAtLocations  {
          country,
          id,
          name,
          place,
          type,
          place_tgn,
          locatedAtGeonames {
            latitude,
            longitude,
            name,
            country_code
          }
        },
        exhibitsItems {
          id,
            artistsCreated {
              id
            }
      } 
      }
    }
  } 
`;

export default GET_EXHIBITIONS_BY_ARTIST;