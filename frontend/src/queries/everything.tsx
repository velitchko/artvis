import { gql } from '@apollo/client';

const GET_EVERYTHING = gql`
query GetEverything($value: String!) { 
    artists(where: { firstname_CONTAINS: $value }) {
        firstname, 
        lastname 
    }

    locations(where: { name_CONTAINS: $value }) {
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