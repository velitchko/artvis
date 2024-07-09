import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeadingComponent from '../components/heading/heading';
import ParticlesComponent from '../components/particles/particles';
import SearchComponent from '../components/search/search';
import NavigationComponent from '../components/navigation/navigation';
import GET_EVERYTHING from '../queries/everything';

class HomePage extends React.Component {
    navigate = useNavigate();

    title = {
        maintitle: 'Art Vis',
        subtitle: 'Art History Visualized'
    };

    handleClick(id: string) {
        console.log('navigating to ' + id);
        // go to the artist detail page 

        this.navigate('/artist/' + id);
    }
    
    render() {
        return (
            <React.StrictMode>
                <NavigationComponent showHeading={ false }/>
                <ParticlesComponent />
                <div className="w-full flex h-[75vh] justify-center items-center mx-auto">
                    <HeadingComponent {...this.title} />
                    <div className="fixed w-full h-full">
                        <div className="w-10/12 h-screen translate-y-[60%] flex-col justify-center mx-auto">
                            <SearchComponent query={ GET_EVERYTHING } onClick={ this.handleClick.bind(this) }/>
                        </div>
                    </div>
                </div>
            </React.StrictMode>
        );
    }

}

export default HomePage;