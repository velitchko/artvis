import { gql } from '@apollo/client';

const GET_ARTISTS = gql`
query Artists { 
    artists {
        firstname, 
        lastname,
        id,
        birthplace,
        birthyear,
        deathyear,
        deathplace,
        country,
        exhibitedAtExhibitions {
            title,
            startdate,
            id
        }
    }
}
`;

// (options: { limit: 100 })

export default GET_ARTISTS;