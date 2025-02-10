import { gql } from '@apollo/client';

const GET_EXHIBITION = gql`
query Exhibitions($where: ExhibitionWhere) { 
    exhibitions(where: $where) {
        id,
        startyear,
        endyear,
        title,
        type,
        exhibitsItems {
            id,
            artistsCreated {
                id
            }
        }
        tookPlaceAtLocations {
            id,
            name,
            locatedAtGeonames {
                country_code,
                latitude,
                longitude,
                name
            }
        }
        artistsExhibitedAt {
            id
        }
    }
}    
`;

export default GET_EXHIBITION;