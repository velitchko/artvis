import { gql } from '@apollo/client';

const GET_ARTISTS_FOR_GROUPS = gql`
query Artists { 
    artists {
        firstname, 
        lastname,
        id,
        birthdate,
        sex,
        country,
        numvenues,
        numcities,
        numcountries,
        exhibitedAtExhibitions {
            id
        }
        coExhibitedTotalArtists {
            id
        }

    }
}
`;

// (options: { limit: 100 })

export default GET_ARTISTS_FOR_GROUPS;