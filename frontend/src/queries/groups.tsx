import { gql } from '@apollo/client';

const GET_GROUPS = gql`
query Groups { 
    groups {
        id,
        name,
        artistsMemberOfAggregate {
            count
        }
    }
}
`;

export default GET_GROUPS;
