import React, { useState } from 'react';
import _ from 'lodash';
import SnapshotHeader from './snapshot-header';
import './snapshot.css';
import SnapshotSidebar from './snapshot-sidebar';
import SnapshotGraph from './snapshot-graph';


const SnapshotComponent = (props: any) => {

    return (
        <>
            <div className="page">
                <header><SnapshotHeader /></header>
                <div className="content">


                    <SnapshotSidebar />

                    <SnapshotGraph />
                </div>
            </div>
        </>
    )
};

export default SnapshotComponent;