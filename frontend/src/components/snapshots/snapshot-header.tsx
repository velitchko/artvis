import React from 'react';
import DateRangeFilter from '../filter/daterangefilter';
import { dateRangeService } from '../../services/date-range-selection.service';
import { graphControlService } from '../../services/graph-controls.service';
import { GraphControls } from '../../models/graph-controls';

class SnapshotHeader extends React.Component {

    layoutChanged(value) {
        let controls = new GraphControls();
        controls.layout = value;
        graphControlService.setData(controls);
    }
    render() {
        return (<div className="header">
            <div className='daterange-filter header-item'>
                <DateRangeFilter />
            </div>
            <div className="graph-controls header-item">
                <select onChange={e => this.layoutChanged(e.target.value)} >
                    <option value="circle">circle</option>
                    <option value="grid">grid</option>
                    <option value="concentric">concentric</option>
                    <option value="breadthfirst">breadthfirst</option>
                    <option value="cise">cise</option>
                </select>
            </div>
        </div>);
    }
};

export default SnapshotHeader;