import { gql } from '@apollo/client';

const GET_EVERYTHING = gql`
query GetEverything($value: String!) { 
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

    hosts(where: { name_CONTAINS: $value }) {
        place,
        name,
        town,
        country
    }

    exhibitions(where: {title_CONTAINS: $value }) {
        title
    }
}
`;

export default GET_EVERYTHING;