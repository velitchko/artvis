import { gql } from '@apollo/client';

const GET_EXHIBITIONS_AND_HOSTS = gql`
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
            id
            name
            country
            place
            place_tgn
            type
            locatedAtGeonames {
                latitude
                longitude
                name
                country_code
            }
        } 
        venuesHeld {
            id
            name
	        place
	        place_tgn
	        type
        }     
        artistsExhibitedAt {
            id
        }
        
    }
}   
`;

export default GET_EXHIBITIONS_AND_HOSTS;