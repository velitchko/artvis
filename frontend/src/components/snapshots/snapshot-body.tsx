import React, { useEffect } from 'react';
import SnapshotGraph from './snapshot-graph';
import GridLayout from "react-grid-layout";

const SnapshotBody = (props: any) => {

    const layout = [
        { i: "a", x: 0, y: 0, w: 1, h: 2, static: true },
        { i: "b", x: 0, y: 1, w: 1, h: 2, static: true }
    ];

    return (<div>
        <div className="graph-container">
            <SnapshotGraph />
        </div>

    </div>);
};

export default SnapshotBody;