import React from 'react';
import NavigationComponent from '../components/navigation/navigation';
import FooterComponent from '../components/footer/footer';
import ParticlesTransparentComponent from '../components/particles/particles-transparent';

const AboutPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <ParticlesTransparentComponent />
            </div>
            <div className="relative z-10">
                <NavigationComponent showHeading={true} />
            
            <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-8 mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                        About Us
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">Art History Visualization</p>
                    
                    <div className="prose prose-lg max-w-none">
                        <p className="text-gray-700 leading-relaxed mb-6">
                            In order to better understand the history of art, a major challenge of Digital Art History (DAH) 
                            is to understand how the components of the art system (persons, objects, places, institutions, and events) 
                            interacted with each other and how these interactions vary over time. The aim of our project is to model 
                            such complex relations through the use of Network Visualization (NetVis).
                        </p>
                        
                        <p className="text-gray-700 leading-relaxed mb-8">
                            Networks have a wide range of application in many domains, including social sciences, software engineering, 
                            and economics. NetVis has proven to be a successful tool to model data and phenomena for tasks in these domains, 
                            yet most modern solutions do not account for the complex aspects of the data and their dynamic. Real-world data 
                            is rarely static and for most application domains and problems it is essential to model and visualize the 
                            evolution and change of attributes and characteristics in the network, its actors, their relationships, 
                            and movement over time.
                        </p>
                    </div>
                </div>

                {/* Team Section */}
                <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Team</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Team</h3>
                            <ul className="space-y-2 text-gray-700">
                                <li>Silvia Miksch</li>
                                <li>Velitchko Filipov</li>
                                <li>Victor Schetinger <span className="text-sm text-gray-500">(until 2023)</span></li>
                                <li>Michaela Tuscher <span className="text-sm text-gray-500">(from 2023)</span></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Partners</h3>
                            <div className="text-gray-700">
                                <p className="font-medium">University of Vienna, Department of Art History</p>
                                <ul className="mt-2 space-y-1">
                                    <li>Raphael Rosenberg</li>
                                    <li>Teresa Kamencek</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Institutional Logos Section */}
                <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Partners & Funding</h2>
                    
                    <div className="grid md:grid-cols-3 gap-8 mb-8">
                        {/* TU Wien Logo */}
                        <div className="text-center">
                            <div className="h-20 bg-gray-100 rounded-lg flex items-center justify-center mb-2 border-2 border-dashed border-gray-300">
                                <span className="text-gray-500 text-sm">TU Wien Logo</span>
                            </div>
                            <p className="text-sm text-gray-600">Vienna University of Technology</p>
                        </div>
                        
                        {/* University of Vienna Logo */}
                        <div className="text-center">
                            <div className="h-20 bg-gray-100 rounded-lg flex items-center justify-center mb-2 border-2 border-dashed border-gray-300">
                                <span className="text-gray-500 text-sm">UniVie Logo</span>
                            </div>
                            <p className="text-sm text-gray-600">University of Vienna</p>
                        </div>
                        
                        {/* FWF Logo */}
                        <div className="text-center">
                            <div className="h-20 bg-gray-100 rounded-lg flex items-center justify-center mb-2 border-2 border-dashed border-gray-300">
                                <span className="text-gray-500 text-sm">FWF Logo</span>
                            </div>
                            <p className="text-sm text-gray-600">Austrian Science Fund</p>
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* CVAST Logo */}
                        <div className="text-center">
                            <div className="h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-2 border-2 border-dashed border-gray-300">
                                <span className="text-gray-500 text-sm">CVAST Logo</span>
                            </div>
                            <p className="text-sm text-gray-600">Center for Visual Analytics Science and Technology</p>
                        </div>
                        
                        {/* Department Logo */}
                        <div className="text-center">
                            <div className="h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-2 border-2 border-dashed border-gray-300">
                                <span className="text-gray-500 text-sm">Art History Dept. Logo</span>
                            </div>
                            <p className="text-sm text-gray-600">Department of Art History</p>
                        </div>
                    </div>
                </div>

                {/* Project Details */}
                <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Details</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Duration</h3>
                                <p className="text-gray-700">August 2022 - September 2027</p>
                            </div>
                            
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    Ongoing
                                </span>
                            </div>
                        </div>
                        
                        <div>
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Funding</h3>
                                <p className="text-gray-700">
                                    Austrian Science Fund (FWF), grant <span className="font-mono">[P35767]</span>
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Grant-DOI: <a href="https://doi.org/10.55776/P35767" 
                                    className="text-blue-600 hover:text-blue-800 underline" 
                                    target="_blank" rel="noopener noreferrer">10.55776/P35767</a>
                                </p>
                            </div>
                            
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact</h3>
                                <p className="text-gray-700">Silvia Miksch</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Website</h3>
                        <a href="https://artvis.cvast.tuwien.ac.at" 
                           className="text-blue-600 hover:text-blue-800 underline"
                           target="_blank" rel="noopener noreferrer">
                            https://artvis.cvast.tuwien.ac.at
                        </a>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default AboutPage;
