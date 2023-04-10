import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import SnapshotHeader from './snapshot-header';
import './snapshot.css';
import SnapshotSidebar from './snapshot-sidebar';
import SnapshotBody from './snapshot-body';


const SnapshotComponent = (props: any) => {

    return (
        <>
            <div className="page">
                <header><SnapshotHeader /></header>
                <div className="content">
                    <SnapshotSidebar />
                    <SnapshotBody />
                </div>
            </div>
        </>
    )
};

export default SnapshotComponent;