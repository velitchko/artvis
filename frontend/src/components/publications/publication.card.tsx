import React from 'react';

interface Publication {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  year: number;
  type: string;
  doi?: string;
  url?: string;
  bibtex: string;
}

interface Props {
  publication: Publication;
}

const PublicationCard: React.FC<Props> = ({ publication }) => {
  const handleCopyBibtex = () => {
    navigator.clipboard.writeText(publication.bibtex);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4 border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{publication.title}</h3>
          <div className="text-sm text-gray-700 mb-1">
            <span className="font-semibold">Authors:</span> {publication.authors.join(', ')}
          </div>
          <div className="text-sm text-gray-600 mb-1">
            <span className="font-semibold">Year:</span> {publication.year} &nbsp;|&nbsp; <span className="font-semibold">Venue:</span> {publication.venue}
          </div>
          <div className="text-sm text-gray-600 mb-1">
            <span className="font-semibold">Type:</span> {publication.type}
          </div>
          {publication.doi && (
            <div className="text-sm text-blue-700 mb-1">
              <span className="font-semibold">DOI:</span> <a href={`https://doi.org/${publication.doi}`} target="_blank" rel="noopener noreferrer" className="underline">{publication.doi}</a>
            </div>
          )}
        </div>
        <div className="mt-2 md:mt-0 flex flex-col items-end">
          <button
            onClick={handleCopyBibtex}
            className="px-3 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
            title="Copy BibTeX"
          >
            Copy BibTeX
          </button>
          <a
            href={publication.url || (publication.doi ? `https://doi.org/${publication.doi}` : undefined)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-xs text-blue-600 underline"
          >
            View Publication
          </a>
        </div>
      </div>
      <details className="mt-2">
        <summary className="text-xs text-gray-500 cursor-pointer">Show BibTeX</summary>
        <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto mt-1">{publication.bibtex}</pre>
      </details>
    </div>
  );
};

export default PublicationCard;
