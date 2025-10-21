import { gql } from '@apollo/client';

const GET_GROUPS = gql`
query Groups { 
    groups {
        id,
        name,
        artistsMemberOfAggregate {
            count
        }
        artistsMemberOf {
            id
            exhibitedAtExhibitions {
                id
                startyear
            }
        }
    }
}
`;

export default GET_GROUPS;
