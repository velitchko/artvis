import React from 'react';
import DateRangeFilter from '../filter/daterangefilter';
import { dateRangeService } from '../../services/date-range-selection.service';
import { graphControlService } from '../../services/graph-controls.service';
import { GraphControls } from '../../models/graph-controls';
import ParticlesComponent from '../particles/particles';

class SnapshotHeader extends React.Component {

    layoutChanged(value) {
        let controls = new GraphControls();
        controls.layout = value;
        graphControlService.setData(controls);
    }
    render() {
        return (<div className="header">
            <div className='logo-container'>
                <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl">
                    Art
                    <span className="font-face-kolker text-8xl">Vis</span>
                </h1>
            </div>
            <div className='daterange-filter header-item'>
                <DateRangeFilter />
            </div>
            <div className="graph-controls header-item">
                <label>Layout</label>
                <select onChange={e => this.layoutChanged(e.target.value)} >
                    <option value="circle">circle</option>
                    <option value="grid">grid</option>
                    <option value="concentric">concentric</option>
                    <option value="breadthfirst">breadthfirst</option>
                    <option value="cise">cise</option>
                    <option value="cola">cola</option>
                </select>
            </div>
        </div>);
    }
};

export default SnapshotHeader;