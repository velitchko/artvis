import React from 'react';
import PublicationCard from './publication.card';
import { publications } from '../../data/publications';

// Group publications by year, reverse chronological order
const groupByYear = (pubs: typeof publications) => {
  const grouped: { [year: number]: typeof publications } = {};
  pubs.forEach(pub => {
    if (!grouped[pub.year]) grouped[pub.year] = [];
    grouped[pub.year].push(pub);
  });
  return grouped;
};

const PublicationsList: React.FC = () => {
  // Sort publications by year descending, then by title
  const sorted = [...publications].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  const grouped = groupByYear(sorted);
  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="w-full">
      {years.map(year => (
        <div key={year} className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-1">{year}</h2>
          {grouped[Number(year)].map(pub => (
            <PublicationCard key={pub.id} publication={pub} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default PublicationsList;
