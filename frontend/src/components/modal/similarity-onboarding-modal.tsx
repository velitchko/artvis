import React from 'react';
import Modal from '../modal/modal';

export interface SimilarityOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SimilarityOnboardingModal: React.FC<SimilarityOnboardingModalProps> = ({ 
    isOpen, 
    onClose 
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Timeline Similarity Feature"
            maxWidth="3xl"
        >
            <div className="space-y-6">
                {/* Main Overview */}
                <div className="bg-gray-50 border-2 border-black p-4 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-bold text-black mb-3">Artist Timeline View</h3>
                    <p className="text-sm lg:text-base text-gray-700 mb-4">
                        This view displays artists as compact cards showing their exhibition activity over time. 
                        Each timeline visualizes when and how frequently an artist exhibited, revealing career patterns, 
                        peak periods, and activity spans.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div><strong>Timeline Visualization:</strong> Black lines show exhibition frequency across years</div>
                            <div><strong>Artist Information:</strong> Name, country, birth/death years, and exhibition count</div>
                        </div>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div><strong>Scaling Options:</strong> Toggle between relative (per artist) and absolute (global) scaling</div>
                            <div><strong>Navigation:</strong> Ctrl+Click on any timeline to view detailed artist information</div>
                        </div>
                    </div>
                </div>

                {/* Two-column layout for features and research goals */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Purpose & Goals */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">Purpose & Research Goals</h3>
                        <p className="text-sm lg:text-base text-gray-700 mb-3">
                            This visualization enables art historical research by revealing temporal patterns and connections:
                        </p>
                        <div className="space-y-1 text-sm lg:text-base text-gray-700">
                            <div>• <strong>Career Patterns:</strong> Identify common trajectory types</div>
                            <div>• <strong>Contemporary Networks:</strong> Discover artists active in the same periods</div>
                            <div>• <strong>Historical Context:</strong> Understand exhibition activity and art movements</div>
                            <div>• <strong>Comparative Analysis:</strong> Compare artists across different eras and countries</div>
                            <div>• <strong>Exhibition Behavior:</strong> Analyze frequency and peak periods</div>
                        </div>
                    </div>

                    {/* Navigation & Interaction */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">Navigation & Interaction</h3>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">Click:</span>
                                <span>Select an artist as the base for similarity comparison</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">Ctrl+Click:</span>
                                <span>Open artist's detailed page in a new tab</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">Hover:</span>
                                <span>Highlight artist card with yellow background</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">Search:</span>
                                <span>Use the "Find" field to locate specific artists</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Similarity Feature Introduction */}
                <div className="bg-blue-50 border-2 border-black p-4 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-bold text-black mb-3">Timeline Similarity Feature</h3>
                    <p className="text-sm lg:text-base text-gray-700">
                        Compare the exhibition timeline shapes of different artists to find patterns, 
                        similarities, and interesting connections in their career trajectories. This powerful 
                        feature helps discover artists with similar career arcs, contemporary periods, or exhibition behaviors.
                    </p>
                </div>

                {/* Two-column layout for usage and algorithms */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* How to Use */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">How to Use Similarity Mode</h3>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">1.</span>
                                <span>Click the <strong>"Similarity"</strong> button in the header</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">2.</span>
                                <span>Click on any artist card to set them as your <strong>base artist</strong></span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">3.</span>
                                <span>All artists will be automatically <strong>reordered by similarity</strong></span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-black min-w-fit">4.</span>
                                <span>Adjust the <strong>algorithm</strong> and <strong>shape focus</strong> settings</span>
                            </div>
                        </div>
                    </div>

                    {/* Algorithms */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">Available Algorithms</h3>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div><strong>Combined:</strong> Best overall results using multiple techniques</div>
                            <div><strong>DTW:</strong> Dynamic Time Warping - compares timeline shapes flexibly</div>
                            <div><strong>Correlation:</strong> Statistical correlation between exhibition counts</div>
                            <div><strong>Trend:</strong> Compares career trajectory patterns</div>
                            <div><strong>Cross-Correlation:</strong> Finds shifted timeline similarities</div>
                            <div><strong>Frequency:</strong> Compares frequency domain characteristics</div>
                        </div>
                    </div>
                </div>

                {/* Three-column layout for features */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Shape Focus */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">Shape Focus Option</h3>
                        <p className="text-sm lg:text-base text-gray-700">
                            When enabled, focuses more on the <strong>shape</strong> of the timeline 
                            rather than absolute values. Useful for comparing artists with different 
                            scales but similar career patterns.
                        </p>
                    </div>

                    {/* Visual Indicators */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">Visual Indicators</h3>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-yellow-50 border-2 border-black"></div>
                                <span><strong>Yellow:</strong> Base artist</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-white border-2 border-black border-dashed"></div>
                                <span><strong>Dashed:</strong> Base highlighting</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-yellow-100"></div>
                                <span><strong>Light yellow:</strong> Hover</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div>
                        <h3 className="text-md lg:text-lg font-bold text-black mb-3">Quick Tips</h3>
                        <div className="space-y-1 text-sm lg:text-base text-gray-700">
                            <div>• Toggle <strong>Scaling</strong> modes for different insights</div>
                            <div>• Try different <strong>algorithms</strong> for various similarities</div>
                            <div>• Enable <strong>Shape Focus</strong> for pattern matching</div>
                            <div>• Most similar artists appear at the top</div>
                        </div>
                    </div>
                </div>

                {/* Comprehensive Configuration Panel */}
                <div className="bg-gray-50 border-2 border-gray-300 p-4 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-bold text-black mb-4">💡 Complete Configuration Guide</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div>• <strong>Timeline Scaling:</strong> "Relative" (individual) vs "Absolute" (global) scaling</div>
                            <div>• <strong>Curve Rendering:</strong> "Jagged" (sharp lines) vs "Smooth" (curved lines) timeline visualization</div>
                            <div>• <strong>Similarity Algorithms:</strong> Multiple algorithms for discovering different patterns</div>
                            <div>• <strong>Shape Focus:</strong> Emphasize pattern over magnitude for better comparison</div>
                            <div>• <strong>Sorting Options:</strong> Name, exhibition count, birth year, or country</div>
                        </div>
                        <div className="space-y-2 text-sm lg:text-base text-gray-700">
                            <div>• <strong>Navigation:</strong> Ctrl+Click opens detailed artist biography</div>
                            <div>• <strong>Search:</strong> Quick artist lookup with real-time filtering</div>
                            <div>• <strong>Grid Layout:</strong> Adjustable columns per row for optimal viewing</div>
                            <div>• <strong>Interactive Features:</strong> Hover highlighting and selection feedback</div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default SimilarityOnboardingModal;
