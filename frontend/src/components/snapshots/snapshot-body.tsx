import React, { useEffect } from 'react';
import SnapshotGraph from './snapshot-graph';
import GridLayout from "react-grid-layout";

const SnapshotBody = (props: any) => {

    const layout = [
        { i: "a", x: 0, y: 0, w: 1, h: 2, static: true },
        { i: "b", x: 1, y: 0, w: 3, h: 2, minW: 2, maxW: 4 },
        { i: "c", x: 4, y: 0, w: 1, h: 2 }
    ];

    return (<div>
        <GridLayout
            className="layout"
            layout={layout}
            cols={2}
            rowHeight={30}
            width={1200}
        >
            <div key="a"><SnapshotGraph /></div>

        </GridLayout>

    </div>);
};

export default SnapshotBody;