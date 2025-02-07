import { gql } from '@apollo/client';

const GET_EXHIBITION = gql`
query Exhibitions($where: ExhibitionWhere) { 
    exhibitions(where: $where) {
        id,
        startyear,
        endyear,
        organizer,
        title,
        type,
        itemsWasExhibitedAt {
            id,
            artistsCreated {
                id
            }
        }
        tookPlaceAtLocations {
            id,
            name,
            place,
            country
        }
        artistsExhibitedAt {
            id
        }
    }
}    
`;

export default GET_EXHIBITION;