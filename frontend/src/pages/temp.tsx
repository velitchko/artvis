import React from 'react';
import ParticlesComponent from '../components/particles/particles';

class TempComponent extends React.Component {

    title = {
        maintitle: 'Art Vis',
        subtitle: 'Art History Visualized'
    };

    render() {
        return (
            <div>
                <ParticlesComponent />
                <h1>Temp</h1>
            </div>
        );
    }

}

export default TempComponent;