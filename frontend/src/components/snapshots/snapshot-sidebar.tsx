import React, { useState } from 'react';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faBars } from '@fortawesome/free-solid-svg-icons';
import { emitCustomEvent, useCustomEventListener } from 'react-custom-events'


const SnapshotSidebar = (props: any) => {


    const [isOpen, setIsOpen] = useState(false)
    const handleTrigger = () => setIsOpen(!isOpen)
    const [snapShots, setSnapshotList] = useState([]);

    useCustomEventListener('SNAPSHOT_CREATED', (snapshotData) => {
       const newList = snapShots.concat(snapshotData);
        setSnapshotList(newList);
    })

    function createSnapShot(): void {
        emitCustomEvent('CREATE_SNAPSHOT')
    }

    return (<div className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        <div className="trigger" onClick={handleTrigger}>
            <FontAwesomeIcon icon={isOpen ? faTimes : faBars} />
        </div>
        <div className='snapshot-controls'>
            <button onClick={createSnapShot}>Create Snapshot</button>
        </div>
        <div className='sidebar-container'>
            {snapShots.map((snapshot) => (
                <div key={snapshot.creationDate.getTime()} className="sidebar-position">
                    <div className="snapshot-info"><span>snapshot1</span></div>
                    <div className="image-contaner">
                        <img src={snapshot.imageUrl} />
                    </div>
                </div>
            ))}
        </div>
    </div>);
};

export default SnapshotSidebar;