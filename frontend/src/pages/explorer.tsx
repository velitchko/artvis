import React, { useEffect, useState } from 'react';
import NetworkComponent from '../components/network/network';
import NavigationComponent from '../components/navigation/navigation';
import client from '../components/apollo/client';
import GET_COEXHIBITIONS from '../queries/coexhibitionQuery';

const ExplorerPage = (props: any) => {

    const [data, setData] = useState([]);
    const [loading, setLoading ] = useState(true);

    useEffect(() => {
        client.query({
            query: GET_COEXHIBITIONS,
            variables: {
                where: {
                    edge: {
                        startdate: 1900,
                        enddate: 1910
                    }
                }
            }
        })
        .then(result => {
            setData(result.data);
            console.log(result.data);
            setLoading(false);
        });
    }, []);
    
        return (
            <React.StrictMode>
                <NavigationComponent />
                <NetworkComponent nodes={[]} links={[]} width={ 100 } height={ 100 } />
            </React.StrictMode>
        );
}

export default ExplorerPage;