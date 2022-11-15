import React from 'react';
import { Link } from "react-router-dom";
import _ from 'lodash';

import {
    ApolloProvider,
    ApolloClient,
    createHttpLink,
    InMemoryCache,
    gql,
    ApolloLink
} from '@apollo/client';

import { environment } from '../../../environments/environment.dev';
import { colors } from '../../colors/colors';

type IResults = {
    artists: Array<any>,
    locations: Array<any>,
    exhibitions: Array<any>,
    catalogues: Array<any>,
    catalogueEntries: Array<any>,
    items: Array<any>
};

class SearchComponent extends React.Component<{}, { value: string, placeholder: string, results: IResults }> {
    httpLink: ApolloLink;
    client: ApolloClient<any>;

    constructor(props: any) {
        super(props);

        this.state = {
            value: '',
            placeholder: 'Search for anything...',
            results: {
                artists: new Array<any>(),
                locations: new Array<any>(),
                exhibitions: new Array<any>(),
                catalogues: new Array<any>(),
                catalogueEntries: new Array<any>(),
                items: new Array<any>()
            }
        };

        this.handleChange = this.handleChange.bind(this);

        this.httpLink = createHttpLink({
            uri: environment.graphQL
        });

        this.client = new ApolloClient({
            link: this.httpLink,
            cache: new InMemoryCache()
        });
    }

    debouncedSearch = _.debounce((value: string) => {
        if (value === '') {
            this.setState({
                results: {
                    artists: new Array<any>(),
                    locations: new Array<any>(),
                    exhibitions: new Array<any>(),
                    catalogues: new Array<any>(),
                    catalogueEntries: new Array<any>(),
                    items: new Array<any>()
                }
            });
            return;
        }

        this.client.query({
            query: gql`query { 
                artists(where: { 
                    OR: [
                        { OR: [
                                { firstname_CONTAINS: "${value}" },
                                { firstname_CONTAINS: "${value.toLowerCase()}" },
                                { firstname_CONTAINS: "${value.toUpperCase()}" },
                                { firstname_CONTAINS: "${value.charAt(0).toUpperCase() + value.slice(1)}" }
                            ]
                        }, 
                        { OR: [
                            { lastname_CONTAINS: "${value}" },
                            { lastname_CONTAINS: "${value.toLowerCase()}" },
                            { lastname_CONTAINS: "${value.toUpperCase()}" },
                            { lastname_CONTAINS: "${value.charAt(0).toUpperCase() + value.slice(1)}" }
                            ]
                        }
                    ]
                }) {
                    firstname, 
                    lastname 
                }

                locations(where: {
                    OR: [
                        { OR: [
                                { name_CONTAINS: "${value}" },
                                { name_CONTAINS: "${value.toLowerCase()}" },
                                { name_CONTAINS: "${value.toUpperCase()}" },
                                { name_CONTAINS: "${value.charAt(0).toUpperCase() + value.slice(1)}" }
                        ] },
                        { OR: [
                                { town_CONTAINS: "${value}" },
                                { town_CONTAINS: "${value.toLowerCase()}" },
                                { town_CONTAINS: "${value.toUpperCase()}" },
                                { town_CONTAINS: "${value.charAt(0).toUpperCase() + value.slice(1)}" }
                        ] },
                        { OR: [
                                { country_CONTAINS: "${value}" },
                                { country_CONTAINS: "${value.toLowerCase()}" },
                                { country_CONTAINS: "${value.toUpperCase()}" },
                                { country_CONTAINS: "${value.charAt(0).toUpperCase() + value.slice(1)}" }
                        ] },
                        { OR: [
                                { place_CONTAINS: "${value}" },
                                { place_CONTAINS: "${value.toLowerCase()}" },
                                { place_CONTAINS: "${value.toUpperCase()}" },
                                { place_CONTAINS: "${value.charAt(0).toUpperCase() + value.slice(1)}" }
                        ] }
                    ]
                }) {
                    place,
                    name,
                    town,
                    country
                }

                exhibitions(where: {
                    OR: [
                            { title_CONTAINS: "${value}" },
                            { title_CONTAINS: "${value.toLowerCase()}" },
                            { title_CONTAINS: "${value.toUpperCase()}" },
                            { title_CONTAINS: "${value.charAt(0).toUpperCase() + value.slice(1)}" }
                        ] 
                }) {
                    title
                }
            }`
        }).then((results: { data: IResults }) => {
            console.log(results.data.artists);
            this.setState({
                results: {
                    artists: results.data.artists,
                    locations: results.data.locations,
                    exhibitions: results.data.exhibitions,
                    catalogues: new Array<any>(),
                    catalogueEntries: new Array<any>(),
                    items: new Array<any>()
                }
            });
        });
    }, 500);

    handleChange($event: any): void {
        this.setState({ value: $event.target.value });
        this.debouncedSearch($event.target.value);
    }

    render() {
        return (
            <ApolloProvider client={this.client}>
                <div className="fixed w-full h-full">
                    <div className="w-10/12 h-screen translate-y-2/4 flex-col justify-center mx-auto">
                        <div className="relative">
                            <input
                                className="relative p-4 pl-12 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:border-sky-500 focus:ring-sky-500 focus:ring-2"
                                type="search"
                                placeholder={this.state.placeholder}
                                value={this.state.value}
                                onChange={this.handleChange}
                            />
                            <svg className="w-6 h-6 absolute left-2.5 top-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <ul className="bg-white border border-gray-100 w-full mt-2 overflow-y-auto h-auto max-h-[35vh]">
                            {
                                this.state.results.artists.map((result, index) => {
                                    return (
                                        <li key={index} className="pl-8 pr-2 py-1 border-b-2 border-gray-100 relative cursor-pointer hover:bg-yellow-50 hover:text-gray-900">
                                            <div className="inline-block">
                                                <Link to="network" relative="path">
                                                    <svg className="absolute w-4 h-4 left-2 top-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className={`px-2 py-0 mr-2 rounded-full text-white font-semibold text-sm ${colors.get(result.__typename)}`}>
                                                        {result.__typename}
                                                    </span>
                                                    <b>
                                                        {
                                                            // TODO: fix to highlight only part that matches not entire first name
                                                            result.firstname.replace(
                                                                new RegExp(this.state.value, 'gi'), (match: any) => {
                                                                    return `${match}`
                                                                })
                                                        }
                                                    </b>
                                                    {' ' + result.lastname}
                                                </Link>
                                            </div>
                                        </li>
                                    );
                                })
                            }
                            {
                                this.state.results.locations.map((result, index) => {
                                    return (
                                        <li key={index} className="pl-8 pr-2 py-1 border-b-2 border-gray-100 relative cursor-pointer hover:bg-yellow-50 hover:text-gray-900">
                                            <div className="inline-block">
                                                <Link to="network" relative="path">
                                                    <svg className="absolute w-4 h-4 left-2 top-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className={`px-2 py-0 mr-2 rounded-full text-white font-semibold text-sm ${colors.get(result.__typename)}`}>
                                                        {result.__typename}
                                                    </span>
                                                    <b>
                                                        {
                                                            // TODO: fix to highlight only part that matches not entire first name
                                                            result.name.replace(
                                                                new RegExp(this.state.value, 'gi'), (match: any) => {
                                                                    return `${match}`
                                                                })
                                                        }
                                                    </b>
                                                    {` ${result.place}, ${result.country}`}
                                                </Link>
                                            </div>
                                        </li>
                                    );
                                })
                            }
                            {
                                this.state.results.exhibitions.map((result, index) => {
                                    return (
                                        <li key={index} className="pl-8 pr-2 py-1 border-b-2 border-gray-100 relative cursor-pointer hover:bg-yellow-50 hover:text-gray-900">
                                            <div className="inline-block">
                                                <Link to="network" relative="path">
                                                    <svg className="absolute w-4 h-4 left-2 top-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className={`px-2 py-0 mr-2 rounded-full text-white font-semibold text-sm ${colors.get(result.__typename)}`}>
                                                        {result.__typename}
                                                    </span>
                                                    <b>
                                                        {
                                                            // TODO: fix to highlight only part that matches not entire first name
                                                            result.title.replace(
                                                                new RegExp(this.state.value, 'gi'), (match: any) => {
                                                                    return `${match}`
                                                                })
                                                        }
                                                    </b>
                                                    {/* {` ${result.place}, ${result.country}`} */}
                                                </Link>
                                            </div>
                                        </li>
                                    );
                                })
                            }
                        </ul>
                    </div>
                </div>
            </ApolloProvider>
        );
    }
};

export default SearchComponent;