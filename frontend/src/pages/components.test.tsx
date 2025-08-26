import React, { useEffect, useState } from 'react';
import client from '../components/apollo/client';
import { Artist } from '../models/artist.model';
import { Node } from '../models/node';
import GET_ARTIST from '../queries/artist';
import NavigationComponent from '../components/navigation/navigation';
import ArtistDetailComponent from '../components/artists/artist.detail.refactored';
import LoadingComponent from '../components/loading/loading';
import { useParams } from 'react-router-dom';

const ComponentTestPage = () => {
    let resolvedId = BigInt(1);
    
    let { id } = useParams();
    if (id === undefined) {
        // set id to random number 1-14000
        resolvedId = BigInt(Math.floor(Math.random() * 14000));
    } else {
        resolvedId = BigInt(id);
    }
    
    const [artist, setArtist] = useState(null as unknown as Artist);
    const [loading, setLoading ] = useState(true);
    const [moreLoading, setMoreLoading] = useState(false);
    const [activeComponent, setActiveComponent] = useState<'detail' | 'network' | 'table' | 'chart'>('detail');

    const load = (result: boolean) => {
        console.log("load more", result);
        setMoreLoading(result);
    }

    useEffect(() => {
        // Load artist data
        client.query({
            query: GET_ARTIST,
            variables: {
                searchId: resolvedId.toString()
            }
        })
        .then(result => {
            const artistData = result.data.artists[0] as Artist;
            setArtist(artistData);
            setLoading(false);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            setLoading(false);
        });
    }, [resolvedId]);

    const renderActiveComponent = () => {
        if (loading) {
            return <LoadingComponent overlay={false} size="large" showLogo={true} />;
        }

        switch (activeComponent) {
            case 'detail':
                return <ArtistDetailComponent artist={artist} loadCallback={load}/>;
            
            case 'network':
                return (
                    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-4">🕸️</div>
                            <h3 className="text-lg font-semibold text-gray-700">Ego Network Component</h3>
                            <p className="text-gray-500">Refactored with modern React hooks and D3 integration</p>
                            <p className="text-sm text-gray-400 mt-2">Requires co-exhibition data to display</p>
                        </div>
                    </div>
                );
            
            case 'table':
                return (
                    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-4">📊</div>
                            <h3 className="text-lg font-semibold text-gray-700">Exhibition Table Component</h3>
                            <p className="text-gray-500">Configurable table with sorting and pagination</p>
                            <p className="text-sm text-gray-400 mt-2">Fully refactored with TypeScript generics</p>
                        </div>
                    </div>
                );
            
            case 'chart':
                return (
                    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-4">📈</div>
                            <h3 className="text-lg font-semibold text-gray-700">Area Chart Component</h3>
                            <p className="text-gray-500">Interactive D3.js area chart with animations</p>
                            <p className="text-sm text-gray-400 mt-2">Modern React hooks integration</p>
                        </div>
                    </div>
                );
            
            default:
                return <div>Select a component to test</div>;
        }
    };

    return (
        <>
            <React.StrictMode>
                <NavigationComponent showHeading={true} />
                <div className="h-[80px]"></div>
                
                {/* Testing indicator and controls */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 mx-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-blue-800">🧪 Refactored Components Test Lab</h2>
                            <p className="text-blue-600">Testing refactored components with Artist ID: {resolvedId.toString()}</p>
                        </div>
                        <div className="text-sm text-blue-500">
                            URL: /components-test/{resolvedId.toString()}
                        </div>
                    </div>
                    
                    {/* Component selector */}
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setActiveComponent('detail')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeComponent === 'detail'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
                            }`}
                        >
                            Artist Detail
                        </button>
                        <button
                            onClick={() => setActiveComponent('network')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeComponent === 'network'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
                            }`}
                        >
                            Ego Network
                        </button>
                        <button
                            onClick={() => setActiveComponent('table')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeComponent === 'table'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
                            }`}
                        >
                            Exhibition Table
                        </button>
                        <button
                            onClick={() => setActiveComponent('chart')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeComponent === 'chart'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
                            }`}
                        >
                            Area Chart
                        </button>
                    </div>
                </div>

                {/* Component display area */}
                <div className="mx-4 mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">
                            {activeComponent === 'detail' && '👤 Artist Detail Component (Refactored)'}
                            {activeComponent === 'network' && '🕸️ Ego Network Component (Refactored)'}
                            {activeComponent === 'table' && '📊 Exhibition Table Component (Refactored)'}
                            {activeComponent === 'chart' && '📈 Area Chart Component (Refactored)'}
                        </h3>
                        
                        {renderActiveComponent()}
                    </div>
                </div>

                {/* Component info */}
                <div className="mx-4 mb-8">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-2">Refactoring Benefits:</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                            {activeComponent === 'detail' && (
                                <>
                                    <p>✅ Converted from class component to functional component with hooks</p>
                                    <p>✅ Enhanced TypeScript interfaces and type safety</p>
                                    <p>✅ Modular timeline data processing with proper separation of concerns</p>
                                    <p>✅ Improved performance with memoization and optimized re-renders</p>
                                </>
                            )}
                            {activeComponent === 'network' && (
                                <>
                                    <p>✅ Modern D3.js integration with React hooks pattern</p>
                                    <p>✅ All interaction functions implemented (drawCircles, highlightCircle, etc.)</p>
                                    <p>✅ Proper cleanup and memory management</p>
                                    <p>✅ Enhanced event handling and tooltip system</p>
                                </>
                            )}
                            {activeComponent === 'table' && (
                                <>
                                    <p>✅ Generic TypeScript implementation for any data type</p>
                                    <p>✅ Configurable column system with flexible rendering</p>
                                    <p>✅ Built-in sorting, filtering, and pagination</p>
                                    <p>✅ Responsive design with modern styling</p>
                                </>
                            )}
                            {activeComponent === 'chart' && (
                                <>
                                    <p>✅ Responsive D3.js area chart with proper React integration</p>
                                    <p>✅ Smooth animations and transitions using React hooks</p>
                                    <p>✅ Interactive tooltips with customizable formatting</p>
                                    <p>✅ Configurable grid lines and axis styling</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation links */}
                <div className="mx-4 mb-8">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">🔗 Test Routes Available:</h4>
                        <div className="text-sm text-green-700 space-y-1">
                            <p>• <code>/artists-test/{resolvedId.toString()}</code> - Simple artist detail test</p>
                            <p>• <code>/components-test/{resolvedId.toString()}</code> - Comprehensive component testing (current page)</p>
                            <p>• <code>/artist/{resolvedId.toString()}</code> - Original artist detail page</p>
                        </div>
                    </div>
                </div>

                {moreLoading && (
                    <LoadingComponent 
                        overlay={true} 
                        size="large" 
                        showLogo={true}
                    />
                )}
            </React.StrictMode>
        </>
    );
}

export default ComponentTestPage;
