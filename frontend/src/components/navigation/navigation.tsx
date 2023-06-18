import React from 'react';
import SmallHeadingComponent from '../heading/small.heading';
import { ROUTES } from '../../routes/routes';
class NavigationComponent extends React.Component<{ showHeading: boolean }, { showHeading: boolean }> {
    constructor(props: { showHeading: boolean }) {
        super(props);

        this.state = {
            showHeading: props.showHeading
        };
    }

    toggleNavbar() {
        console.log('toggle navbar');
        const navbar = document.getElementById('navbar-default');

        if (!navbar) return console.error('navbar-default not found');

        if (navbar.classList.contains('hidden')) {
            navbar.classList.remove('hidden');
        } else {
            navbar.classList.add('hidden');
        }
    }

    render() {
        return (
            <React.StrictMode>
                <nav className="bg-transparent fixed z-10">
                    <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto">
                        <button onClick={() => this.toggleNavbar()}
                            type="button"
                            className="fixed top-0 right-0 z-20 inline-flex items-center p-2 text-md text-black rounded-lg lg:hidden">
                            <span className="sr-only">Open main menu</span>
                            <svg className="w-10 h-10" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
                        </button>
                        <div className="hidden w-full lg:block lg:w-auto lg:m-auto lg:items-center lg:justify-between z-10" id="navbar-default">
                            <ul className="lg:w-full lg:m-auto font-medium lg:flex flex-col p-2 mt-2 lg:flex-row lg:space-x-8 lg:mt-0">
                                {ROUTES.map((route, index) => {
                                    return <li key={index}>
                                        <a href={route.path} className="block py-2 pl-3 pr-4 md:p-4" aria-current="page">
                                            <mark className="px-4 py-2 text-white border-4 border-white hover:bg-white hover:border-black hover:border-4 hover:text-black hover:bg-transparent bg-black rounded">{route.name}</mark>
                                        </a>
                                    </li>
                                })}
                            </ul>
                        </div>
                    {this.state.showHeading && <SmallHeadingComponent></SmallHeadingComponent>}
                    </div>
                </nav>
            </React.StrictMode>
        );
    }
};

export default NavigationComponent;