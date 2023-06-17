import React, { useState } from 'react';
import NetworkComponent from '../components/network/network';
import NavigationComponent from '../components/navigation/navigation';

const ExplorerPage = (props: any) => {

    const [data, setData] = useState([]);

        return (
            <React.StrictMode>
                <NavigationComponent />
                <NetworkComponent nodes={[]} links={[]} width={ 100 } height={ 100 } />
            </React.StrictMode>
        );
}

export default ExplorerPage;