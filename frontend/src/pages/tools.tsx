import React from 'react';
import NavigationComponent from '../components/navigation/navigation';
import FooterComponent from '../components/footer/footer';
import ParticlesTransparentComponent from '../components/particles/particles-transparent';
import schemaImg from '../assets/schema.png';

const tools = [
    {
        id: 'exhibition-explorer',
        title: 'Exhibition Explorer',
        what: 'Interactive explorer of exhibitions and their items.',
        how: 'Filter by year, location or artist; inspect exhibition metadata and item lists.',
        why: 'Quickly find connections between shows, trace exhibition histories, and compare venues.',
        questions: 'Which exhibitions connected a group of artists? How did exhibition locations change over time?',
        media: schemaImg
    },
    {
        id: 'artist-network',
        title: 'Artist Network',
        what: 'Network visualization of artists and co-exhibitions.',
        how: 'Dynamic force-directed graph with timeline controls and node/edge selection.',
        why: 'Reveal communities, central actors, and co-exhibition patterns across time.',
        questions: 'Who are the most connected artists? Which clusters represent movements or shared venues?',
        media: schemaImg
    },
    {
        id: 'artist-detail',
        title: 'Artist Detail View',
        what: 'Detailed view for a single artist including exhibitions and items.',
        how: 'Timeline and item gallery with linked maps and related-artist links.',
        why: 'Deep-dive into an artist\'s exhibition history and relationships.',
        questions: 'When and where did this artist exhibit? With whom did they exhibit most often?',
        media: schemaImg
    }
];

const ToolsPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <ParticlesTransparentComponent />
            </div>
            <div className="relative z-10">
                <NavigationComponent showHeading={true} />

                <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-8 mb-8">
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Tools & Interfaces</h1>
                        <p className="text-xl text-gray-600 mb-4">Interactive tools built for exploring the ArtVis dataset.</p>
                        <div className="prose prose-lg max-w-none">
                            <p className="text-gray-700 leading-relaxed">
                                This page collects the main interactive components of the project: lightweight explorers, visualizations, and detail views designed for analysis and discovery. Each entry below contains a short GIF/MP4 (add to <strong>src/assets/tools/</strong>) showing the view and interactions, a concise description of what the tool does, how it works, why it is useful, and which research questions it can help answer.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {tools.map((t) => (
                            <div key={t.id} className="bg-white/90 backdrop-blur-sm rounded-lg shadow p-6">
                                <div className="md:flex md:items-start md:space-x-6">
                                    <div className="md:flex-shrink-0 mb-4 md:mb-0 flex justify-center">
                                        <img src={t.media} alt={t.title} className="w-full sm:w-80 sm:h-48 md:w-96 md:h-56 object-cover rounded-lg shadow" />
                                    </div>
                                    <div className="prose prose-md max-w-none">
                                        <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
                                        <div className="mt-2 text-gray-700">
                                            <p><strong>What:</strong> {t.what}</p>
                                            <p><strong>How:</strong> {t.how}</p>
                                            <p><strong>Why:</strong> {t.why}</p>
                                            <p><strong>Questions:</strong> {t.questions}</p>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-2">Media: place a GIF/MP4 at <strong>src/assets/tools/{t.id}.mp4</strong> or <strong>{t.id}.gif</strong> to replace the placeholder.</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                <FooterComponent />
            </div>
        </div>
    );
};

export default ToolsPage;
