import { gql } from '@apollo/client';

const GET_ARTISTS = gql`
query Artists { 
    artists {
        firstname, 
        lastname,
        id,
        birthplace,
        birthdate,
        deathdate,
        deathplace,
        country,
        exhibitedExhibitions {
            title,
            startdate,
            id
        }
    }
}
`;

// (options: { limit: 100 })

export default GET_ARTISTS;