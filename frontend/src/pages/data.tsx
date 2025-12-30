import * as React from 'react';
import schemaImg from '../assets/schema.png';
import NavigationComponent from '../components/navigation/navigation';
import FooterComponent from '../components/footer/footer';
import ParticlesTransparentComponent from '../components/particles/particles-transparent';

const DataPage: React.FC = () => (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
            <ParticlesTransparentComponent />
        </div>
        <div className="relative z-10">
            <NavigationComponent showHeading={true} />
            <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-8 mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">About the Data</h1>
                    <p className="text-xl text-gray-600 mb-8">ArtVis Project Database</p>
                    <div className="prose prose-lg max-w-none">
                        <p className="text-gray-700 leading-relaxed mb-6">
                            This project is based on the database of the research project
                            <a href="https://exhibitions.univie.ac.at" className="text-blue-600 hover:text-blue-800 underline ml-1" target="_blank" rel="noopener noreferrer">Exhibitions of Modern European Painting 1905-1915</a>
                            &nbsp;(Austrian Science Fund FWF, Project Number P 29997-G24, 2017–2021).
                        </p>
                        <p className="text-gray-700 leading-relaxed mb-6">
                            The project investigates how modern painting was presented and received in the early 20th century, focusing on exhibitions and their catalogues. The database covers exhibitions from 1905 to 1915, a period marked by the emergence of avant-garde movements such as Fauvism, Expressionism, Cubism, Futurism, and others.
                        </p>
                        <p className="text-gray-700 leading-relaxed mb-6">
                            The data is structured as a graph database (Neo4j), accessible via a public
                            <a href="https://artvis.cvast.tuwien.ac.at/api" className="text-blue-600 hover:text-blue-800 underline ml-1" target="_blank" rel="noopener noreferrer">GraphQL endpoint</a>.
                            The main entities and their relationships are illustrated below:
                        </p>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            <strong>Key entities:</strong> Exhibition, Artist, Item, Group, Venue, Location, Geoname, Organizer
                        </p>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            <strong>Key relationships:</strong> Artists exhibit at Exhibitions, create Items, are members of Groups; Exhibitions are held at Venues and organized by Organizers; Venues and Locations are geolocated.
                        </p>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            For more details, see the
                            <a href="https://exhibitions.univie.ac.at" className="text-blue-600 hover:text-blue-800 underline ml-1" target="_blank" rel="noopener noreferrer">original project website</a>.
                        </p>
                        <p className="text-sm text-gray-500 mt-8">
                            Project funded by the Austrian Science Fund (FWF), Project Number P 29997-G24.
                        </p>
                    </div>
                    <ul className="mb-6 list-disc list-inside text-gray-700">
                        <li>~1,300 exhibitions</li>
                        <li>Over 200,000 catalogue entries</li>
                        <li>13,000+ artists</li>
                        <li>Open and accessible for research</li>
                    </ul>
                    <div className="mb-6">
                        <img src={schemaImg} alt="Graph structure of the database" className="rounded shadow-lg mx-auto" />
                    </div>

                    {/* Schema Description Section */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow p-6 mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Schema Description</h2>
                        <div className="prose prose-md max-w-none text-gray-800">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Nodes</h2>
                            <hr className="my-4" />
                            <ul>
                                <li><strong>Organizer</strong> – An entity (institution or individual) responsible for organizing exhibitions.</li>
                                <li><strong>Exhibition</strong> – A cultural event where artworks or items are presented to the public.</li>
                                <li><strong>Venue</strong> – A physical site (e.g., museum, gallery) where an exhibition is held.</li>
                                <li><strong>Location</strong> – A general geographic entity (e.g., city, region) associated with an exhibition or venue.</li>
                                <li><strong>Geoname</strong> – A normalized geographic identifier used for consistent spatial referencing (has latitude and longitude).</li>
                                <li><strong>Item</strong> – An artwork or exhibited object shown within an exhibition.</li>
                                <li><strong>Artist</strong> – A person who creates items and participates in exhibitions.</li>
                                <li><strong>Group</strong> – A collective, movement, or organization that an artist belongs to.</li>
                            </ul>
                            <h2 className="text-xl font-bold text-gray-900 mt-4 mb-4">Relationships</h2>
                            <hr className="my-4" />
                            <ul>
                                <li><strong>ORGANIZED</strong> <code>(Organizer → Exhibition)</code> – Indicates that an organizer planned or curated an exhibition.</li>
                                <li><strong>HELD</strong> <code>(Exhibition → Venue)</code> – Specifies the venue at which an exhibition was held.</li>
                                <li><strong>TOOK_PLACE_AT</strong> <code>(Exhibition → Location)</code> – Associates an exhibition with a broader geographic location.</li>
                                <li><strong>LOCATED_AT</strong> <code>(Venue → Geoname)</code> – Links a venue to its standardized geographic identifier.</li>
                                <li><strong>LOCATED_AT</strong> <code>(Location → Geoname)</code> – Maps a general location to a normalized geospatial reference.</li>
                                <li><strong>EXHIBITED_AT</strong> <code>(Item → Exhibition)</code> – States that an item was shown as part of an exhibition.</li>
                                <li><strong>CREATED</strong> <code>(Artist → Item)</code> – Indicates authorship of an exhibited item by an artist.</li>
                                <li><strong>MEMBER_OF</strong> <code>(Artist → Group)</code> – Describes an artist’s affiliation with a group or collective.</li>
                                <li><strong>CO_EXHIBITED</strong> <code>(Artist → Artist)</code> – Captures pairwise co-participation of artists in the same exhibition.</li>
                                <li><strong>CO_EXHIBITED_TOTAL</strong> <code>(Artist → Artist)</code> – Aggregates the total number of co-exhibitions between two artists.</li>
                            </ul>
                        </div>
                    </div>
                    {/* Citation Section */}
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Citation</h2>
                        <div className="mb-2">
                            <span className="text-gray-700 text-sm block">
                                Bartosch, C., Mulloli, N., Burckhardt, D., Dohring, M., Ahmad, W., & Rosenberg, R. (2020). <i>The database of modern exhibitions (DoME): European paintings and drawings 1905-1915</i>. In <i>The Routledge Companion to Digital Humanities and Art History</i> (Chap. 30, pp. 423-434). Routledge. <a href="https://doi.org/10.4324/9780429505188-36" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">https://doi.org/10.4324/9780429505188-36</a>
                            </span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => {
                                    const bib = `@book{bartosch_dome,\n  title        = {The database of modern exhibitions (DoME): European paintings and drawings 1905-1915},\n  author       = {Bartosch, Christina and Mulloli, Nirmalie and Burckhardt, Daniel and Döhring, Marei and Ahmad, Walid and Rosenberg, Raphael},\n  year         = 2020,\n  booktitle    = {The Routledge Companion to Digital Humanities and Art History},\n  pages        = {423--434},\n  doi          = {10.4324/9780429505188-36},\n  chapter      = 30\n}`;
                                    if (navigator.clipboard) {
                                        navigator.clipboard.writeText(bib);
                                    } else {
                                        const ta = document.createElement('textarea');
                                        ta.value = bib;
                                        document.body.appendChild(ta);
                                        ta.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(ta);
                                    }
                                }}
                                className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition"
                            >
                                Copy BibTeX
                            </button>
                            <button
                                onClick={() => {
                                    const el = document.getElementById('bibtex-full');
                                    if (el) el.classList.toggle('hidden');
                                }}
                                className="text-sm px-3 py-1 bg-white border rounded hover:bg-gray-50 transition"
                            >
                                Show BibTeX
                            </button>
                        </div>
                        <pre id="bibtex-full" className="hidden mt-3 p-3 bg-gray-50 rounded text-xs text-gray-700 overflow-auto whitespace-pre-wrap">
                            {`
@book{bartosch_dome,
  title        = {The database of modern exhibitions (DoME): European paintings and drawings 1905-1915},
  author       = {Bartosch, Christina and Mulloli, Nirmalie and Burckhardt, Daniel and Döhring, Marei and Ahmad, Walid and Rosenberg, Raphael},
  year         = 2020,
  booktitle    = {The Routledge Companion to Digital Humanities and Art History},
  pages        = {423--434},
  doi          = {10.4324/9780429505188-36},
  chapter      = 30
}
`}
                        </pre>
                    </div>
                </div>
            </div>
            <FooterComponent />
        </div>
    </div>
);

export default DataPage;
