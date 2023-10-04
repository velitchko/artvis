import { gql } from '@apollo/client';

const GET_ARTIST_BY_NAME = gql`
query ArtistByName($value: String!) {
    artists(where: { 
        OR: [
            { firstname_CONTAINS: $value },
            { lastname_CONTAINS: $value }
        ]
    }) 
    {
        firstname, 
        lastname,
        id
    }
}
`;

export default GET_ARTIST_BY_NAME;