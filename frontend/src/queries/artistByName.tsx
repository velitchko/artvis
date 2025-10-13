import { gql } from '@apollo/client';

const GET_ARTIST_BY_NAME = gql`
query ArtistByName($value: String!) {
    artists(where: { 
        OR: [
            { firstname_CONTAINS: $value },
            { lastname_CONTAINS: $value }
        ]
    }, options: { limit: 20 }) 
    {
        firstname, 
        lastname,
        id,
        country,
        birthyear,
        deathyear,
        birthplace,
        deathplace
    }
}
`;

export default GET_ARTIST_BY_NAME;