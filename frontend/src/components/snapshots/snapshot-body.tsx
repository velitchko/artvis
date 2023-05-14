import React, { useEffect } from 'react';
import SnapshotGraph from './snapshot-graph';
import GridLayout from "react-grid-layout";

const SnapshotBody = (props: any) => {
    return (<div>
        <div className="graph-container">
            <div className='graph'>
                <SnapshotGraph isSnapshot={false} id={0} />
            </div>
            <div className='graph'>
                <SnapshotGraph isSnapshot={true} id={1} />
            </div>
            <div className='graph'>
                <SnapshotGraph isSnapshot={true} id={2} />
            </div>
        </div>

    </div>);
};

export default SnapshotBody;