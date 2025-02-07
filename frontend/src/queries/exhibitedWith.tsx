import { gql } from '@apollo/client';

const GET_ARTIST_EXHIBITED_WITH = gql`
query Artists ($searchId: BigInt!) { 
    artists(where: { id: $searchId }) {
        sortname,
        id,
        country,
        sex,
        birthyear,
        coExhibitedArtists {
            sortname,
            id, 
            country,
            sex,
            exhibitedAtExhibitions {
                title,
                startyear,
                id,
                itemsWasExhibitedAtAggregate {
                    count
                }
            }  
        }
    }
}
`;

export default GET_ARTIST_EXHIBITED_WITH;