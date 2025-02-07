import { gql } from '@apollo/client';

const GET_ARTIST = gql`
query Artists ($searchId: BigInt!) { 
    artists(where: { id: $searchId }) {
        sortname,
        id,
        country,
        sex,
        birthyear,
        birthplace,
        deathyear,
        deathplace,
        coExhibitedArtists {
            sortname,
            id, 
            country,
            sex,
            birthyear,
            deathyear,
            birthplace,
            deathplace,
            exhibitedAtExhibitions {
                title,
                startdate,
                id,
                startyear,
                itemsWasExhibitedAtAggregate {
                    count
                }
            }  
        }
        coExhibitedTotalArtists {
            sortname,
            id, 
            country,
            sex,
            birthyear,
            deathyear,
            birthplace,
            deathplace
        }
        exhibitedAtExhibitions {
            title,
            startdate,
            id,
            startyear,
            itemsWasExhibitedAtAggregate {
                count
            }
        }
    }
}
`;

export default GET_ARTIST;