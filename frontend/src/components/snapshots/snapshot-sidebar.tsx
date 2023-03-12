import React, { useState } from 'react';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faBars } from '@fortawesome/free-solid-svg-icons';

const SnapshotSidebar = (props: any) => {

    const [isOpen, setIsOpen] = useState(false)
    const handleTrigger = () => setIsOpen(!isOpen)

    return (<div className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        <div className="trigger" onClick={handleTrigger}>
            <FontAwesomeIcon icon={isOpen ? faTimes : faBars} />
        </div>
        <div className="sidebar-position">
            <div className="snapshot-info"><span>snapshot1</span></div>
            <div className="image-contaner"></div>
        </div>
        <div className="sidebar-position">
            <div className="snapshot-info"><span>snapshot1</span></div>
            <div className="image-contaner"></div>
        </div>
        <div className="sidebar-position">
            <div className="snapshot-info"><span>snapshot1</span></div>
            <div className="image-contaner"></div>
        </div>
    </div>);
};


export default SnapshotSidebar;