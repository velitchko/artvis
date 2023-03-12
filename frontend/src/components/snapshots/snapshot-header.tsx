import React from 'react';
import DateRangeFilter from '../filter/daterangefilter';

class SnapshotHeader extends React.Component {

    render() {
        return (<div className="header">
            <div className='daterange-filter'>
                <DateRangeFilter />
            </div>
        </div>);
    }
};

export default SnapshotHeader;