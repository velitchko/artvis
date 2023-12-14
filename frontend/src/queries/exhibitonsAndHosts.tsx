import { gql } from '@apollo/client';

const GET_EXHIBITIONS_AND_HOSTS = gql`
query Exhibitions($where: ExhibitionWhere) { 
    exhibitions(where: $where) {
        id,
        startdate,
        enddate,
        organizer,
        title,
        type,       
        catalogueEntriesEntryIn {
            id,
            id_person
        } 
        tookPlaceInHosts {
            id,
            name,
            country,
            place,
            latitude,
            longitude,
            place_tgn,
            town,
            type
        }       
        artistsExhibited {
            id
        } 
    }
}   
`;

export default GET_EXHIBITIONS_AND_HOSTS;