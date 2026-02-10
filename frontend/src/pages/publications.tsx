import React, { useState } from 'react';
import NavigationComponent from '../components/navigation/navigation';
import FooterComponent from '../components/footer/footer';
import ParticlesTransparentComponent from '../components/particles/particles-transparent';
import { publications } from '../data/publications';
import { Publication } from '../models/publication.model';

function groupByYear(pubs: Publication[]) {
    return pubs.reduce((acc: Record<string, Publication[]>, pub) => {
        const y = String(pub.year || 'Unknown');
        if (!acc[y]) acc[y] = [];
        acc[y].push(pub);
        return acc;
    }, {});
}

const PubCard: React.FC<{ pub: Publication }> = ({ pub }) => {
    const [showBib, setShowBib] = useState(false);

    const copyBib = async () => {
        const text = pub.bibtex || '';
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    };

    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow p-4 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold text-gray-900">{pub.title}</div>
                        <div className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">{pub.type || 'work'}</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{(pub.authors || []).join(', ')}</div>
                    <div className="text-sm text-gray-700 mt-2 italic">{pub.venue} {pub.doi ? (
                        <span>— <a className="text-blue-600 underline inline-flex items-center gap-1" href={pub.url} target="_blank" rel="noreferrer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline"><path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0 0-7.07 5 5 0 0 0-7.07 0L9.93 5.93"></path><path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 0 7.07 5 5 0 0 0 7.07 0L14 18.07"></path></svg>
                            <span>doi:{pub.doi}</span>
                        </a></span>
                    ) : null}</div>
                </div>
                <div className="flex-shrink-0 text-sm text-gray-500">
                    <div className="text-right">{pub.year || '—'}</div>
                </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
                <button onClick={copyBib} className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition">Copy BibTeX</button>
                <button onClick={() => setShowBib(s => !s)} className="text-sm px-3 py-1 bg-white border rounded hover:bg-gray-50 transition">{showBib ? 'Hide' : 'Show'} BibTeX</button>
                {pub.url ? (
                    <a href={pub.url} target="_blank" rel="noreferrer" className="ml-auto text-sm text-blue-600 underline">Open source</a>
                ) : null}
            </div>

            {showBib && (
                <pre className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-700 overflow-auto whitespace-pre-wrap">{pub.bibtex}</pre>
            )}
        </div>
    );
}

const PublicationsPage: React.FC = () => {
    const pubs = [...publications].sort((a, b) => (b.year || 0) - (a.year || 0));

    const corePubs = pubs.filter(p => (p as any).group === 'core');
    const relatedPubs = pubs.filter(p => (p as any).group !== 'core');

    const groupedCore = groupByYear(corePubs);
    const groupedRelated = groupByYear(relatedPubs);

    const coreYears = Object.keys(groupedCore).sort((a, b) => Number(b) - Number(a));
    const relatedYears = Object.keys(groupedRelated).sort((a, b) => Number(b) - Number(a));

    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <ParticlesTransparentComponent />
            </div>
            <div className="relative z-10">
                <NavigationComponent showHeading={true} />

                <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-8 mb-8">
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Publications</h1>
                        <p className="text-lg text-gray-600">A curated list of publications and outputs.</p>
                        <p className="text-md text-gray-500 mt-4">
                            For more details please refer to our project webpage&nbsp;
                            <a
                                href="https://www.cvast.tuwien.ac.at/projects/artvis"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                            >
                                https://www.cvast.tuwien.ac.at/projects/artvis
                            </a>
                        </p>
                    </div>

                    {corePubs.length > 0 && (
                        <div className="mb-10">
                            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Core Publications</h2>
                            {coreYears.map(year => (
                                <section key={`core-${year}`} className="mb-6">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-3">{year}</h3>
                                    <div className="grid gap-4 md:grid-cols-1">
                                        {groupedCore[year].map(pub => (
                                            <PubCard key={pub.id + pub.title} pub={pub} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}

                    {relatedPubs.length > 0 && (
                        <div className="mb-10">
                            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Related Publications</h2>
                            {relatedYears.map(year => (
                                <section key={`related-${year}`} className="mb-6">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-3">{year}</h3>
                                    <div className="grid gap-4 md:grid-cols-1">
                                        {groupedRelated[year].map(pub => (
                                            <PubCard key={pub.id + pub.title} pub={pub} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PublicationsPage;
