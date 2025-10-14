import React, { useCallback, useState } from 'react';
import _ from 'lodash';
import GET_EVERYTHING from '../../queries/everything';
import ResultsComponent from './results';
import client from '../apollo/client';
import { DocumentNode, gql } from '@apollo/client';

type IResults = {
    artists?: Array<any>,
    hosts?: Array<any>,
    exhibitions?: Array<any>,
    catalogues?: Array<any>,
    catalogueEntries?: Array<any>,
    items?: Array<any>
};

const SearchComponent = (props: any) => {
    const [value, setValue] = useState('');
    const [placeholder, setPlaceholder] = useState('Search for anything...');
    const [results, setResults] = useState<Array<any>>(new Array<any>());
    const [resultsLoaded, setResultsLoaded] = useState(false);
    const [query, setQuery] = useState<any>(props.query); // QUERY is passed as prop
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

    const handleClick = ($event: any): void => {
        onClick($event); // we just bubble up the event (id -- string)
    }

    return (
        <>
            <div className="relative">
                <input
                    className="w-full px-12 py-4 sm:py-5 text-base sm:text-lg text-gray-900 bg-white rounded-full border border-gray-300 shadow-lg hover:shadow-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    type="search"
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                />
                <svg className="w-5 h-5 sm:w-6 sm:h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            {resultsLoaded &&
                <ResultsComponent results={results} value={value} onClick={handleClick} />
            }
        </>
    );
};

export default SearchComponent;

