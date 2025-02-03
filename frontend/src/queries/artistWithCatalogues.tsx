import { gql } from '@apollo/client';


// TODO: calculate age on the fly
const GET_ARTIST_AND_CATALOGUES = gql`
query Artists ($searchId: String!) { 
    artists(where: { id: $searchId }) {
        firstname, 
        lastname,
        id,
        country,
        sex,
        birthdate,
        birthplace,
        deathdate,
        deathplace,
        exhibitedWithArtists {
            firstname,
            lastname,
            id, 
            country,
            sex,
            birthdate,
            deathdate,
            birthplace,
            deathplace,
            exhibitedExhibitions {
                title,
                startdate,
                id
            }  
        }
        exhibitedExhibitions {
            title,
            startdate,
            id
          catalogueEntriesEntryIn {
            id_person
          }
        }
    }
}
`;

export default GET_ARTIST_AND_CATALOGUES;