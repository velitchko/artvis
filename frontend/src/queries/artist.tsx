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
        artistsCoExhibited {
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
                exhibitsItemsAggregate {
                    count
                }
            }
        }  
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
                exhibitsItemsAggregate {
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
            exhibitsItemsAggregate {
                count
            }
        }
    }
}
`;

export default GET_ARTIST;