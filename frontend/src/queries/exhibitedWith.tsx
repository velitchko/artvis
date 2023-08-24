import { gql } from '@apollo/client';


// TODO: calculate age on the fly
const GET_ARTIST_EXHIBITED_WITH = gql`
query Artists ($searchId: String!) { 
    artists(where: { id: $searchId }) {
        firstname, 
        lastname,
        id,
        country,
        sex,
        exhibitedWithArtists {
            firstname,
            lastname,
            id, 
            country,
            sex,
            exhibitedExhibitions {
                title,
                startdate,
                id
            }  
        }
        exhibitedExhibitions {
            title,
            startdate,
            id
        }
    }
}
`;

export default GET_ARTIST_EXHIBITED_WITH;