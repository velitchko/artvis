import { gql } from '@apollo/client';

const GET_EXHIBITION = gql`
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
            place,
            country
        }
        artistsExhibited {
            id
        }
    }
}   
`;

export default GET_EXHIBITION;