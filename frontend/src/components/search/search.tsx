import React, { useCallback, useState, useRef } from 'react';
import _ from 'lodash';
import GET_EVERYTHING from '../../queries/everything';
import ResultsComponent from './results';
import client from '../apollo/client';
import { DocumentNode, gql } from '@apollo/client';
import { colors } from '../../colors/colors';

type IResults = {
    artists?: Array<any>,
    hosts?: Array<any>,
    exhibitions?: Array<any>,
    catalogues?: Array<any>,
    catalogueEntries?: Array<any>,
    items?: Array<any>
};


const queryExamples = [
    {
        label: "Vassily Kandinsky",
        url: "https://artvis.cvast.tuwien.ac.at/artist/5",
        type: "artist"
    },
    {
        label: "Hagenbund",
        url: "https://artvis.cvast.tuwien.ac.at/group/100",
        type: "group"
    },
    {
        label: "Pablo Picasso",
        url: "https://artvis.cvast.tuwien.ac.at/artist/301",
        type: "artist"
    },
    {
        label: "Klimt Group",
        url: "https://artvis.cvast.tuwien.ac.at/group/102",
        type: "group"
    }
];

const SearchComponent = (props: any) => {
    const [value, setValue] = useState('');
    const [placeholder, setPlaceholder] = useState('Search for anything...');
    const [results, setResults] = useState<Array<any>>(new Array<any>());
    const [resultsLoaded, setResultsLoaded] = useState(false);
    const [query, setQuery] = useState<any>(props.query); // QUERY is passed as prop
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const onClick = props.onClick; // ONCLICK is passed as prop

    const search = (value: string): void => {
        if (value === '') {
            setResults(new Array<any>());
            return;
        }

        value = value.substring(0, 1).toUpperCase() + value.substring(1);

        client.query({ query: query, variables: { value: value } }).then((result: any) => {
            const data = new Array<any>();

            if (result.data.artists) data.push(result.data.artists.map((artist: any) => { return { name: artist.firstname + ' ' + artist.lastname, type: 'Artist', id: artist.id } }));
            if (result.data.venues) data.push(result.data.venues.map((venue: any) => { return { name: venue.name, type: 'Venue', id: venue.id } }));
            if (result.data.exhibitions) data.push(result.data.exhibitions.map((exhibition: any) => { return { name: exhibition.title, type: 'Exhibition', id: exhibition.id } }));
            if (result.data.organizers) data.push(result.data.organizers.map((organizer: any) => { return { name: organizer.name, type: 'Organizer', id: organizer.id }}));

            setResults(data.flat());
            setResultsLoaded(true);
        });
    }

    const debouncedSearch = useCallback(_.debounce(search, 250), []);


    const handleChange = ($event: any): void => {
        setResultsLoaded(false);
        setValue($event.target.value);
        debouncedSearch($event.target.value);
    }

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        // Only blur if the new focus is outside the dropdown
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsFocused(false);
        }
    };

    const handleClick = ($event: any): void => {
        onClick($event); // we just bubble up the event (id -- string)
    }


    return (
        <>
            <div className="relative" tabIndex={-1} onBlur={handleBlur}>
                <input
                    ref={inputRef}
                    className="w-full px-12 py-4 sm:py-5 text-base sm:text-lg text-gray-900 bg-white rounded-full border border-gray-300 shadow-lg hover:shadow-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    type="search"
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    autoComplete="off"
                />
                <svg className="w-5 h-5 sm:w-6 sm:h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {isFocused && value === '' && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 shadow-lg rounded-lg z-10">
                        <div className="px-4 py-2 text-gray-500 text-sm font-semibold border-b border-gray-100">Query Examples</div>
                        {queryExamples.map((example, idx) => {
                            // Capitalize type for color lookup
                            const typeLabel = example.type.charAt(0).toUpperCase() + example.type.slice(1);
                            const typeColor = colors.get(typeLabel) || 'bg-gray-300';
                            return (
                                <button
                                    key={example.label}
                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-100 focus:outline-none text-gray-800 flex items-center gap-2"
                                    tabIndex={0}
                                    onMouseDown={e => { e.preventDefault(); window.open(example.url, '_blank'); setIsFocused(false); }}
                                >
                                    <span className="inline-block align-middle mr-2 bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold">Example</span>
                                    <span className={`inline-block align-middle mr-2 rounded-full px-2 py-1 text-xs font-semibold text-white ${typeColor}`}>{typeLabel}</span>
                                    <span>{example.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            {resultsLoaded &&
                <ResultsComponent results={results} value={value} onClick={handleClick} />
            }
        </>
    );
};

export default SearchComponent;

