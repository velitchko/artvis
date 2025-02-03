import React from 'react';
import _ from 'lodash';
import client from '../apollo/client';
import { DocumentNode } from '@apollo/client';
import { Exhibition } from '../../models/exhibition.model';
import { Artist } from '../../models/artist.model';
import { CatalogueEntry } from '../../models/catalogueEntry.model';
import { Host } from '../../models/host.model';

type IResults = {
    artists?: Array<any>,
    hosts?: Array<any>,
    exhibitions?: Array<any>,
    catalogues?: Array<any>,
    catalogueEntries?: Array<any>,
    items?: Array<any>
};

type MetaExhibition = Exhibition & { isCommon: boolean, percentBase: number, percentCompare: number };

class EHTableComponent extends React.Component<{ query: DocumentNode, baseId: string, compareWith: Artist | null, exhibitions: Array<Exhibition> | undefined, type?: string }, { query: DocumentNode, baseId: string, compareWith: Artist, exhibitions: Array<Exhibition>, results: IResults, loaded: boolean, dir: string }> {

    constructor(props: { query: DocumentNode, baseId: string, exhibitions: Array<Exhibition>, compareWith: Artist, results: IResults, loaded: boolean, dir: string }) {
        super(props);

        this.state = {
            loaded: false,
            baseId: props.baseId,
            results: {
                artists: [],
                hosts: [],
                exhibitions: [],
                catalogues: [],
                catalogueEntries: [],
                items: []
            },
            query: props.query,
            exhibitions: props.exhibitions,
            compareWith: props.compareWith,
            dir: 'asc'
        }
    }

    componentDidMount(): void {
        this.setup();
        /* console.log("table compare did mount");
        console.log(this.state.compareWith); */
    }

    componentDidUpdate(prevProps: Readonly<{ query: DocumentNode; baseId: string, compareWith: Artist | null; exhibitions: Array<Exhibition>; }>, prevState: Readonly<{ query: DocumentNode; compareWith: Artist; results: IResults; loaded: boolean; dir: string; }>, snapshot?: any): void {
        // set state if props.compareWith changes and update results.exhibitions
        if (prevProps.compareWith !== this.props.compareWith) {
            this.setState((prevState: any) => {
                // update results.exhibitions
                const exhibitions = new Array<MetaExhibition>();
                prevState.results.exhibitions?.forEach((exhibition: MetaExhibition) => {
                    const metaExhibition: MetaExhibition = { ...exhibition, isCommon: false, percentBase: 0, percentCompare: 0 };

                    const isCommon = this.props.compareWith?.exhibitedExhibitions?.find((exh: Exhibition) => exh.id === exhibition.id);
                    metaExhibition.isCommon = isCommon ? true : false;
                    metaExhibition.percentBase = exhibition.percentBase;
                    metaExhibition.percentCompare = this.getPercentage(metaExhibition, this.props.compareWith?.id);

                    // const percentBase = this.state..artistsExhibited?.length / this.props.compareWith?.exhibitedExhibitions?.length;
                    exhibitions.push(metaExhibition);
                });
                // sort by isCommon
                exhibitions.sort((a: MetaExhibition, b: MetaExhibition) => {
                    if (a.isCommon && !b.isCommon) return -1;
                    if (!a.isCommon && b.isCommon) return 1;
                    return 0;
                });

                return { ...prevState, compareWith: this.props.compareWith, results: { ...prevState.results, exhibitions: exhibitions } }
            });
        }
    }

    setup() {
        const ids = _.uniqBy(this.props.exhibitions, (exhibition: Exhibition) => exhibition.id).map((exhibition: Exhibition) => exhibition.id);

        if (!ids) return;

        //const ids = +this.state.baseId;

        /*  console.log("table compare ");
         console.log(this.state.compareWith); */
        this.getResults(this.state.query, ids);
    }

    getResults(query: DocumentNode, ids: Array<string>) {
        if (this.state.loaded) return;

        client.query({
            query: query,
            variables: {
                "where": {
                    "id_IN": ids
                }
            }
            /* client.query({
                query: query,
                variables: {
                    searchId: ids
                } */
        }).then((res) => {
            this.setState((prevState: any) => {
                const metaExhibitions = new Array<MetaExhibition>();
                // create deep copy of res.data.exhibitions
                const exhibitions = JSON.parse(JSON.stringify(res.data.exhibitions));

                // sort exhibitions by startdate
                exhibitions.sort((a: Exhibition, b: Exhibition) => {
                    if (a.startdate < b.startdate) return -1;
                    if (a.startdate > b.startdate) return 1;
                    return 0;
                });

                exhibitions.forEach((exhibition: Exhibition) => {
                    //console.log("exhibitions " + exhibition.tookPlaceInHosts[0]);

                    // if startdate is less than 1905 or enddate is greater than 1915 skip
                    if (exhibition.startdate < 1905 || exhibition.enddate > 1915) return;

                    const metaExhibition: MetaExhibition = { ...exhibition, isCommon: false, percentBase: 0, percentCompare: 0 };
                    metaExhibitions.push(metaExhibition);
                });

                return {
                    ...prevState,
                    results: {
                        ...prevState.results,
                        exhibitions: metaExhibitions
                    },
                    loaded: true
                }
            }, () => {
                // iterate over this.state.results.exhibitions and calculate percentage of artworks exhibited at the exhibition
                this.state.results.exhibitions?.forEach((exhibition: MetaExhibition) => {
                    exhibition.percentBase = this.getPercentage(exhibition);
                });
                // force update
                this.setState((prevState: any) => { return { ...prevState } });
            });

        });
    };

    getPercentage(exhibition: MetaExhibition, id?: string): number {
        if (!id) id = this.props.baseId;

        if (!exhibition) return 0;

        // get length of catalogueEntriesEntryIn
        //const baseLength = exhibition.catalogueEntriesEntryIn?.filter((entry: CatalogueEntry) => entry.id_person !== '\\N').length;
        const baseLength = exhibition.catalogueEntriesEntryIn?.length;


        // get amount of catalogueEntries with id_person === id
        const entries = exhibition.catalogueEntriesEntryIn?.filter((entry: CatalogueEntry) => entry.id_person === id)?.length;

        // calculate percentage
        const percentage = (entries / baseLength) * 100;

        return +percentage.toFixed(2);
    }

    sort(property: string) {
        // if length is requested, sort by length of array
        const sortBy = property.split('.')[0];
        let sorted = Array<MetaExhibition>();
        if (property.split('.')[1] === 'length') {
            sorted = _.sortBy(this.state.results.exhibitions, exhibition => {
                // if sortBy is artistsExhibited, return length of unique artists
                return _.uniqBy(exhibition[sortBy], (a: Artist) => a.id).length;
            });

            // if descending, reverse the array
            if (this.state.dir === 'desc') sorted.reverse();

            // use dir to sort ascending or descending
        }
        else if (property.split('.')[1] === 'host') {

            sorted = _.sortBy(this.state.results.exhibitions, 'tookPlaceInHosts[0].' + sortBy);

            // if descending, reverse the array
            if (this.state.dir === 'desc') sorted.reverse();

            // use dir to sort ascending or descending
        }
        else {
            // else sort by property
            sorted = _.sortBy(this.state.results.exhibitions, sortBy);

            if (this.state.dir === 'desc') sorted.reverse();

            // use this.state.dir to sort ascending or descending
        }
        this.setState((prevState: any) => { return { ...prevState, results: { ...prevState.results, exhibitions: sorted } } })

        this.state.dir === 'asc' ? this.setState((prevState: any) => { return { ...prevState, dir: 'desc' } }) : this.setState((prevState: any) => { return { ...prevState, dir: 'asc' } });
    };

    exhibitionIsCommon(e: MetaExhibition): boolean {
        // create array of exhibition ids and isCommon property 
        return e.isCommon ? true : false;
    }

    /** Checks if there is a host, otherwise returns dummy host (for filling the table with data) */
    checkForHost(hosts: Host[]): Host {

        const noHost: Host = {
            id: `-1`,
            country: "\\N",
            name: `NA`,
            latitude: `9999999`,
            longitude: `9999999`,
            place: `NA`,
            place_tgn: `NA`,
            town: `NA`,
            type: `NA`,
            exhibitionsTookPlaceIn: []
        }

        if (hosts[0]) {
            return hosts[0];
        }
        else return noHost;
    }


    render() {

        return (
            <>
                <table className="text-left text-gray-500">
                    <thead className="text-xs bg-gray-200 text-gray-700 uppercase sticky">
                        <tr>
                            {/* <th scope="col" className="px-6 py-3">
                                ID
                            </th> */}
                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('type')}>Type</button>
                            </th>
                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('startdate')}>Date</button>
                            </th>
                            {/* <th scope="col" className="px-6 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('enddate')}>End Date</button>
                            </th> */}
                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('place.host')}>City</button>
                            </th>
                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('country.host')}>Country</button>
                            </th>

                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('title')}>Title</button>
                            </th>
                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('catalogueEntriesEntryIn.length')}>Catalogue Entries</button>
                            </th>
                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('percentBase')}>Base %Entries</button>
                            </th>
                            {
                                this.state.compareWith && <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                    <button onClick={() => this.sort('percentCompare')}>Compare %Entries</button>
                                </th>
                            }
                            {/* <th scope="col" className="px-6 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('tookPlaceInHosts.length')}>Hosts</button>
                            </th> */}
                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('artistsExhibited.length')}>Artists</button>
                            </th>
                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('name.host')}>Host</button>
                            </th>
                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('type.host')}>Hosttype</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* {results.artists && results.artists.map((artist: any) => (
                            <tr className="bg-white border-b" key={artist.id}>
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                    {artist.id}
                            </th>
                                <td className="px-6 py-4">{artist.birthDate}</td>
                                <td className="px-6 py-4">{artist.name}</td>
                            </tr>
                        ))}
    
                        {results.hosts && results.hosts.map((host: any) => (
                            <tr className="bg-white border-b" key={host.id}>
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                    {host.id}
                                </th>
                                <td className="px-6 py-4">{host.name}</td>
                                <td className="px-6 py-4">{host.location}</td>
                            </tr>
                        ))} */}

                        {this.state.results.exhibitions && this.state.results.exhibitions.map((exhibition: MetaExhibition) => (

                            <tr className={`${this.exhibitionIsCommon(exhibition) ? 'bg-amber-100' : 'bg-white'} border-b`} key={exhibition.id}>
                                {/* <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                    {exhibition.id}
                                </th> */}
                                <td className="px-2 py-4">{exhibition.type}</td>
                                <td className="px-2 py-4">{exhibition.startdate}</td>
                                {/* <td className="px-6 py-4">{exhibition.enddate}</td> */}
                                <td className="px-2 py-4">{this.checkForHost(exhibition.tookPlaceInHosts).place}</td>
                                <td className="px-2 py-4">{this.checkForHost(exhibition.tookPlaceInHosts).country}</td>
                                <td className="px-2 py-4">{exhibition.title}</td>
                                <td className="px-2 py-4 text-right">{exhibition.catalogueEntriesEntryIn && exhibition.catalogueEntriesEntryIn.length}</td>
                                <td className="px-2 py-4 text-right">{exhibition.percentBase}%</td>
                                {
                                    this.state.compareWith && <td className="px-2 py-4 text-right">{exhibition.percentCompare}%</td>
                                }
                                {/* <td className="px-6 py-4">{exhibition.tookPlaceInHosts && exhibition.tookPlaceInHosts.length}</td> */}
                                <td className="px-2 py-4 text-right">{exhibition.artistsExhibited && _.uniqBy(exhibition.artistsExhibited, (a: Artist) => a.id).length}</td>
                                {/*<td className="px-6 py-4">{exhibition.tookPlaceInHosts[0].name}</td>*/}
                                <td className="px-2 py-4">{this.checkForHost(exhibition.tookPlaceInHosts).name}</td>
                                <td className="px-2 py-4">{this.checkForHost(exhibition.tookPlaceInHosts).type}</td>

                            </tr>

                        ))}






                        {/* {results.catalogues && results.catalogues.map((catalogue: any) => (
                            <tr className="bg-white border-b" key={catalogue.id}>
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                    {catalogue.id}
                                </th>
                                <td className="px-6 py-4">{catalogue.title}</td>
                                <td className="px-6 py-4">{catalogue.date}</td>
                            </tr>
                        ))}
    
                        {results.catalogueEntries && results.catalogueEntries.map((catalogueEntry: any) => (
                            <tr className="bg-white border-b" key={catalogueEntry.id}>
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                    {catalogueEntry.id}
                                </th>
                                <td className="px-6 py-4">{catalogueEntry.title}</td>
                                <td className="px-6 py-4">{catalogueEntry.date}</td>
                            </tr>
                        ))}
    
                        {results.items && results.items.map((item: any) => (
                            <tr className="bg-white border-b" key={item.id}>
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                    {item.id}
                                </th>
                                <td className="px-6 py-4">{item.title}</td>
                                <td className="px-6 py-4">{item.date}</td>
                            </tr>
                        ))}  */}
                    </tbody>
                </table>
            </>
        );
    }
};

export default EHTableComponent;