import React from 'react';
import SmallHeadingComponent from '../heading/small.heading';

class NavigationComponent extends React.Component {
    // TODO: grab some menu / nav items and render as a list
    render() {
        return (
            <React.StrictMode>
                <nav className="bg-white border-gray-200">
                    <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto pt-4 pb-4">
                        <SmallHeadingComponent></SmallHeadingComponent>
                            
                        <button data-collapse-toggle="navbar-default" type="button" className="inline-flex items-center p-2 ml-3 text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200" aria-controls="navbar-default" aria-expanded="false">
                            <span className="sr-only">Open main menu</span>
                            <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
                        </button>
                        <div className="hidden w-full md:block md:w-auto" id="navbar-default">
                            <ul className="font-medium flex flex-col p-4 md:p-0 mt-4 md:flex-row md:space-x-8 md:mt-0">
                                <li>
                                    <a href="#" className="block py-2 pl-3 pr-4 md:p-0" aria-current="page">
                                        <mark className="px-4 py-2 text-white border-4 border-white hover:bg-white hover:border-black hover:border-4 hover:text-black hover:bg-transparent bg-black rounded">Menu 1</mark>
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="block py-2 pl-3 pr-4 md:p-0">
                                        <mark className="px-4 py-2 text-white border-4 border-white hover:bg-white hover:border-black hover:border-4 hover:text-black hover:bg-transparent bg-black rounded">Menu 2</mark>
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="block py-2 pl-3 pr-4 md:p-0">
                                        <mark className="px-4 py-2 text-white border-4 border-white hover:bg-white hover:border-black hover:border-4 hover:text-black hover:bg-transparent bg-black rounded">Menu 3</mark>
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="block py-2 pl-3 pr-4 md:p-0">
                                        <mark className="px-4 py-2 text-white border-4 border-white hover:bg-white hover:border-black hover:border-4 hover:text-black hover:bg-transparent bg-black rounded">Menu 4</mark>
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="block py-2 pl-3 pr-4 md:p-0">
                                        <mark className="px-4 py-2 text-white border-4 border-white hover:bg-white hover:border-black hover:border-4 hover:text-black hover:bg-transparent bg-black rounded">Menu 5</mark>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>
            </React.StrictMode>
        );
    }
};

export default NavigationComponent;