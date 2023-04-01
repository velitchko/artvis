import { gql } from '@apollo/client';

const GET_EXHIBITIONS_BY_DATE = gql`
query ExhibitedExhibitionsConnection($startDate: Int!, $endDate: Int!) {
  exhibitions(where: {
    AND: [
      {startdate_GTE: $startDate},
      {enddate_LTE: $endDate}
    ]
  }) {
    id
    title
    artistsExhibited {
      id
      firstname
      lastname
    }
  }
}
`;

export default GET_EXHIBITIONS_BY_DATE;