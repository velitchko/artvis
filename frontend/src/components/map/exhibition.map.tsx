import React, { Ref } from 'react';
import _, { Dictionary, min } from 'lodash';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import * as d3 from 'd3';
import client from '../apollo/client';
import GET_ARTIST_EXHIBITED_WITH from '../../queries/exhibitedWith';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';

class ExhibitionMapComponent extends React.Component<{ compareWith: Artist | null, exhibitions: Array<Exhibition> | undefined, width?: number, height?: number, mouseOverCallBack?: Function }, { compareWith: Artist | null, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean }> {


    render() {
        return (
            <>



            </>
        )
    }
};

export default ExhibitionMapComponent;