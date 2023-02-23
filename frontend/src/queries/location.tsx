import { gql } from '@apollo/client';

//get exhibitions at locations, artists that exhibited at locations, and artworks that were exhibited at locations
const GET_LOCATION = gql`
query Locations ($searchId: String!) { 
    locations(where: { id: $searchId }) {
    
    }
}
`;

export default GET_LOCATION;