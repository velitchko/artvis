import { gql } from '@apollo/client';

const GET_GROUP = gql`
query Group ($searchId: BigInt!) { 
    groups(where: { id: $searchId }) {
        id,
        name,
        artistsMemberOf {
            sortname,
            id, 
            country,
            sex,
            birthyear,
            birthplace,
            deathyear,
            deathplace,
            exhibitedAtExhibitions {
                title,
                startdate,
                id,
                startyear,
                exhibitsItemsAggregate {
                    count
                }
                exhibitsItems {
                    id
                    artistsCreated {
                        id
                    }
                }
            }
        }
    }
}
`;

export default GET_GROUP;
