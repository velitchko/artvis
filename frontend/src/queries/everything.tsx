import { gql } from '@apollo/client';

const GET_EVERYTHING = gql`query GetEverything($value: String!) { 
    artists(where: { sortname_CONTAINS: $value }) 
    {
        firstname, 
        lastname,
        id
    }

    exhibitions(where: { 
        OR:  [
            {title_CONTAINS: $value },
            {title_alternate_CONTAINS: $value }
        ]
    }) {
        title,
        id
    }

    organizers(where: { name_CONTAINS: $value }) {
        name,
        id
    }

    venues(where: { name_CONTAINS: $value }) {
        name,
        id
    }
}
`;

export default GET_EVERYTHING;