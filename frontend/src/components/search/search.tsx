import React, { useCallback, useState } from 'react';
import _ from 'lodash';
import GET_EVERYTHING from '../../queries/everything';
import ResultsComponent from './results';
import client from '../apollo/client';

type IResults = {
    artists: Array<any>,
    locations: Array<any>,
    exhibitions: Array<any>,
    catalogues: Array<any>,
    catalogueEntries: Array<any>,
    items: Array<any>
};

const SearchComponent = (props: any) => {
    const [value, setValue] = useState('');
    const [placeholder, setPlaceholder] = useState('Search for anything...');
    const [results, setResults] = useState<Array<any>>(new Array<any>());
    const [resultsLoaded, setResultsLoaded] = useState(false);

    const search = (value: string): void => { 
            if (value === '') {
                setResults(new Array<any>());
                return;
            }
    
            client.query({ query: GET_EVERYTHING, variables: { value: value } }).then((result: any) => {
                console.log('searched for ' + value);const data = new Array<any>();
                data.push(result.data.artists.map((artist: any) => { return { name: artist.firstname + ' ' + artist.lastname, type: 'Artist', id: artist.id } }));
                data.push(result.data.locations.map((location: any) => { return { name: location.name, type: 'Location', id: location.id } }));
                data.push(result.data.exhibitions.map((exhibition: any) => { return { name: exhibition.title, type: 'Exhibition', id: exhibition.id } }));
    
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

    return (
        <div className="fixed w-full h-full">
            <div className="w-10/12 h-screen translate-y-2/4 flex-col justify-center mx-auto">
                <div className="relative">
                    <input
                        className="relative p-4 pl-12 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:border-sky-500 focus:ring-sky-500 focus:ring-2"
                        type="search"
                        placeholder={placeholder}
                        value={value}
                        onChange={handleChange}
                    />
                    <svg className="w-6 h-6 absolute left-2.5 top-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                {resultsLoaded && <ResultsComponent results={results} value={value} />}
            </div>
        </div>
    );
};

export default SearchComponent;

