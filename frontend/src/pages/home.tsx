import React from 'react';
import HeadingComponent from '../components/heading/heading';
import ParticlesComponent from '../components/particles/particles';
import SearchComponent from '../components/search/search';
import NavigationComponent from '../components/navigation/navigation';

class HomePage extends React.Component {

    title = {
        maintitle: 'Art Vis',
        subtitle: 'Art History Visualized'
    };
    
    render() {
        return (
            <React.StrictMode>
                <NavigationComponent showHeading={ false }/>
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