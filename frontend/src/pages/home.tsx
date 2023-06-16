import React from 'react';
import HeadingComponent from '../components/heading/heading';
import ParticlesComponent from '../components/particles/particles';
import SearchComponent from '../components/search/search';

class HomePage extends React.Component {

    title = {
        maintitle: 'Art Vis',
        subtitle: 'Art History Visualized'
    };
    
    render() {
        return (
            <React.StrictMode>
                <ParticlesComponent />
                <SearchComponent />
                <div className="w-full flex h-[75vh] justify-center items-center mx-auto">
                    <HeadingComponent {...this.title} />
                </div>
            </React.StrictMode>
        );
    }

}

export default HomePage;