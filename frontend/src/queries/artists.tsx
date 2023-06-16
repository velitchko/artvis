import { gql } from '@apollo/client';

const GET_ARTISTS = gql`
query Artists { 
    artists {
        firstname, 
        lastname,
        id,
        birthdate,
        birthplace,
        deathdate,
        deathplace,
        country
        exhibitedExhibitions {
            title,
            startdate,
            id
        }
    }
}
`;

export default GET_ARTISTS;