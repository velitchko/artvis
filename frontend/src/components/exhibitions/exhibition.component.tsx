import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import GET_EXHIBITION from '../../queries/exhibition';
import TableComponent from '../table/table';

const ExhibitionsComponent = (props: { artist: Artist }) => {
    const [artist, setArist] = React.useState(props.artist);

    return (
        <>
          { artist && 
           <div>
                <h2>{ artist.firstname + ' ' + artist.lastname}</h2>  
                <TableComponent query={GET_EXHIBITION} baseId={artist.id} compareWith={null} exhibitions={artist.exhibitedExhibitions} />
            </div>
          }
        </>
    );
};

export default ExhibitionsComponent;