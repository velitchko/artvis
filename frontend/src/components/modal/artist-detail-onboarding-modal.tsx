import React from 'react';
import Modal from '../modal/modal';

export interface ArtistDetailOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ArtistDetailOnboardingModal: React.FC<ArtistDetailOnboardingModalProps> = ({ 
    isOpen, 
    onClose 
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Artist Detail Page Features"
            maxWidth="4xl"
        >
            <div className="space-y-6">
                {/* Main Overview */}
                <div className="bg-gray-50 border-2 border-black p-4 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-bold text-black mb-3">Artist Detail Dashboard</h3>
                    <p className="text-sm lg:text-base text-gray-700 mb-4">
                        This comprehensive view provides deep insights into an individual artist's exhibition history, 
                        co-exhibition networks, and career patterns. Explore relationships, compare artists, and discover 
                        connections through multiple visualization modes.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div><strong>Timeline Visualization:</strong> Interactive area chart showing exhibition activity over time</div>
                            <div><strong>Network Analysis:</strong> Visual network of co-exhibited artists with relationship strength</div>
                        </div>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div><strong>Data Tables:</strong> Detailed exhibition records with statistical analysis</div>
                            <div><strong>Artist Comparison:</strong> Side-by-side analysis of exhibition patterns and overlaps</div>
                        </div>
                    </div>
                </div>

                {/* Two-column layout for main features */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Timeline & Visualization Features */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">Timeline & Visualization</h3>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div>• <strong>Interactive Timeline:</strong> Hover to see specific years and exhibition counts</div>
                            <div>• <strong>Brushing & Selection:</strong> Click and drag to zoom into specific time periods</div>
                            <div>• <strong>Network Visualization:</strong> Interactive circle-based network showing artist relationships</div>
                            <div>• <strong>Co-exhibition Filter:</strong> Adjust minimum shared exhibitions threshold</div>
                            <div>• <strong>Visual Highlighting:</strong> Selected periods and artists are highlighted across all views</div>
                        </div>
                    </div>

                    {/* Data Analysis Features */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">Data Analysis & Tables</h3>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div>• <strong>Exhibition Table:</strong> Complete list with venues, dates, and participating artists</div>
                            <div>• <strong>Statistical Analysis:</strong> Base percentage of exhibitions and comparison metrics</div>
                            <div>• <strong>Grouping Options:</strong> Organize by nationality, age group, or gender</div>
                            <div>• <strong>Sorting Controls:</strong> Multiple sorting criteria for different analysis needs</div>
                            <div>• <strong>Comparison Highlighting:</strong> Shared exhibitions are highlighted when comparing artists</div>
                        </div>
                    </div>
                </div>

                {/* Artist Comparison Feature */}
                <div className="bg-blue-50 border-2 border-black p-4 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-bold text-black mb-3">Artist Comparison Feature</h3>
                    <p className="text-sm lg:text-base text-gray-700 mb-4">
                        Compare two artists side-by-side to understand their career overlaps, shared exhibitions, 
                        and relationship patterns. This powerful feature reveals collaborations, contemporary connections, 
                        and exhibition circuit similarities.
                    </p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* How to Use Comparison */}
                        <div>
                            <h3 className="text-md lg:text-lg font-bold text-black mb-3">How to Compare Artists</h3>
                            <div className="space-y-2 text-sm lg:text-base text-gray-700">
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-black min-w-fit">1.</span>
                                    <span>Use the <strong>search box</strong> in the header to find another artist</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-black min-w-fit">2.</span>
                                    <span>Click on any artist from the <strong>search results dropdown</strong></span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-black min-w-fit">3.</span>
                                    <span>The comparison artist's data will be <strong>loaded automatically</strong></span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-black min-w-fit">4.</span>
                                    <span>Shared exhibitions are <strong>highlighted</strong> in the table and timeline</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-black min-w-fit">5.</span>
                                    <span>Use the <strong>clear button</strong> to reset the comparison</span>
                                </div>
                            </div>
                        </div>

                        {/* Comparison Features */}
                        <div>
                            <h3 className="text-md lg:text-lg font-bold text-black mb-3">Comparison Analysis</h3>
                            <div className="space-y-2 text-sm lg:text-base text-gray-700">
                                <div>• <strong>Timeline Overlay:</strong> Both artists' timelines shown together</div>
                                <div>• <strong>Shared Exhibitions:</strong> Common exhibitions highlighted in yellow</div>
                                <div>• <strong>Percentage Analysis:</strong> Compare % column shows overlap statistics</div>
                                <div>• <strong>Network Integration:</strong> Comparison artist appears in network visualization</div>
                                <div>• <strong>Statistical Insights:</strong> Quantified relationship strength and overlap periods</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation & Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Interactive Controls */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">Interactive Controls</h3>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">Search:</span>
                                <span>Debounced search with dropdown results for artist comparison</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">Slider:</span>
                                <span>Co-exhibition count filter affects network and table views</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">Dropdowns:</span>
                                <span>Group by nationality, age, or gender; order by various criteria</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">Network:</span>
                                <span>Interactive network visualization with hover and click interactions</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Indicators */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">Visual Indicators & Colors</h3>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-yellow-200 border border-gray-400"></div>
                                <span><strong>Yellow highlight:</strong> Shared exhibitions in comparison mode</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-100 border border-blue-400"></div>
                                <span><strong>Blue badge:</strong> Active comparison artist indicator</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-100 border border-gray-400"></div>
                                <span><strong>Network nodes:</strong> Size indicates co-exhibition frequency</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-100 border border-green-400"></div>
                                <span><strong>Timeline selection:</strong> Brushed time periods for detailed analysis</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Research Applications */}
                <div className="bg-gray-50 border-2 border-gray-300 p-4 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-bold text-black mb-4">Research Applications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div>• <strong>Career Analysis:</strong> Track exhibition patterns, peak periods, and career trajectories</div>
                            <div>• <strong>Network Studies:</strong> Identify artist communities, collaborations, and exhibition circuits</div>
                            <div>• <strong>Comparative Research:</strong> Analyze contemporary artists and their shared contexts</div>
                            <div>• <strong>Historical Context:</strong> Understand art movements through exhibition participation</div>
                        </div>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div>• <strong>Venue Analysis:</strong> Study gallery relationships and exhibition patterns</div>
                            <div>• <strong>Geographic Patterns:</strong> Explore international exhibition networks</div>
                            <div>• <strong>Statistical Analysis:</strong> Quantify relationships and collaboration strength</div>
                            <div>• <strong>Timeline Correlation:</strong> Discover synchronized career periods and influences</div>
                        </div>
                    </div>
                </div>

                {/* Quick Start Tips */}
                <div className="bg-green-50 border-2 border-green-300 p-4 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-bold text-black mb-4">Quick Start Tips</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div>• Start by exploring the <strong>timeline</strong> to understand career patterns</div>
                            <div>• Adjust the <strong>co-exhibition filter</strong> to focus on significant relationships</div>
                            <div>• Use <strong>search and compare</strong> to analyze artist relationships</div>
                            <div>• Try different <strong>grouping options</strong> for various analytical perspectives</div>
                        </div>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div>• Examine the <strong>network view</strong> to discover connected artists</div>
                            <div>• Browse the <strong>table</strong> for detailed exhibition information</div>
                            <div>• Use <strong>brushing on timeline</strong> to focus on specific periods</div>
                            <div>• Interact with the <strong>network visualization</strong> to explore artist connections</div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ArtistDetailOnboardingModal;