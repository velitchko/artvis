import React from 'react';
import _ from 'lodash';
import client from '../apollo/client';
import { DocumentNode } from '@apollo/client';
import { Exhibition } from '../../models/exhibition.model';
import { Artist } from '../../models/artist.model';
import { Venue } from '../../models/venue.model';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPeopleGroup } from '@fortawesome/free-solid-svg-icons/faPeopleGroup';
import { faPerson } from '@fortawesome/free-solid-svg-icons/faPerson';
import { faGavel } from '@fortawesome/free-solid-svg-icons/faGavel';
import { Item } from '../../models/item.model';



type IResults = {
    artists?: Array<any>,
    venues?: Array<any>,
    exhibitions?: Array<any>,
    items?: Array<any>
};

type MetaExhibition = Exhibition & { isCommon: boolean, percentBase: number, percentCompare: number };

class TableComponent extends React.Component<{ query: DocumentNode, baseId: number, compareWith: Artist | null, exhibitions: Array<Exhibition> | undefined }, { query: DocumentNode, baseId: number, compareWith: Artist, results: IResults, loaded: boolean, dir: string }> {

    constructor(props: { query: DocumentNode, baseId: number, exhibitions: Array<Exhibition>, compareWith: Artist, results: IResults, loaded: boolean, dir: string }) {
        super(props);

        this.state = {
            loaded: false,
            baseId: props.baseId,
            results: {
                artists: [],
                venues: [],
                exhibitions: [],
                items: []
            },
            query: props.query,
            compareWith: props.compareWith,
            dir: 'asc'
        }
    }

    componentDidMount(): void {
        this.setup();
    }

    componentDidUpdate(prevProps: Readonly<{ query: DocumentNode; baseId: number, compareWith: Artist | null; exhibitions: Array<Exhibition>; }>, prevState: Readonly<{ query: DocumentNode; compareWith: Artist; results: IResults; loaded: boolean; dir: string; }>, snapshot?: any): void {
        // set state if props.compareWith changes and update results.exhibitions
        if(prevProps.compareWith !== this.props.compareWith) {
            this.setState((prevState: any) => { 
                // update results.exhibitions
                const exhibitions = new Array<MetaExhibition>();
                prevState.results.exhibitions?.forEach((exhibition: MetaExhibition) => {
                    const metaExhibition: MetaExhibition = { ...exhibition, isCommon: false, percentBase: 0, percentCompare: 0 };
                    
                    let isCommon = false;
                    
                    isCommon = this.props.compareWith?.exhibitedAtExhibitions?.find((exh: Exhibition) => +exh.id === exhibition.id) ? true : false;
                    
                    metaExhibition.isCommon = isCommon;
                    metaExhibition.percentBase = exhibition.percentBase;
                    metaExhibition.percentCompare = this.getPercentage(metaExhibition, this.props.compareWith?.id);
                    
                    // const percentBase = this.state..artistsExhibited?.length / this.props.compareWith?.exhibitedExhibitions?.length;
                    exhibitions.push(metaExhibition);
                });
                // sort by isCommon
                exhibitions.sort((a: MetaExhibition, b: MetaExhibition) => {
                    if(a.isCommon && !b.isCommon) return -1;
                    if(!a.isCommon && b.isCommon) return 1;
                    return 0;
                });

                return { ...prevState, compareWith: this.props.compareWith, results: { ...prevState.results, exhibitions: exhibitions } } 
            });
        } 
    }

    setup() {
        const ids = this.props.exhibitions?.map((exhibition: Exhibition) => exhibition.id);
        if(!ids) return;

        this.getResults(this.state.query, ids);
    }

    getResults(query: DocumentNode, ids: Array<Number>) {
        if(this.state.loaded) return;

        client.query({
            query: query,
            variables: {
                "where": {
                    "id_IN": ids
                }
            }
        }).then((res) => {
            this.setState((prevState: any) => {
                const metaExhibitions = new Array<MetaExhibition>();
                // create deep copy of res.data.exhibitions
                const exhibitions = JSON.parse(JSON.stringify(res.data.exhibitions));
                // sort exhibitions by startyear
                exhibitions.forEach((e: Exhibition) => {
                    e.startyear = +e.startyear
                    e.endyear = +e.endyear
                    e.id = +e.id
                });
                
                exhibitions.sort((a: Exhibition, b: Exhibition) => {
                    if(a.startyear < b.startyear) return -1;
                    if(a.startyear > b.startyear) return 1;
                    return 0;
                });

                exhibitions.forEach((exhibition: Exhibition) => {
                    // if startyear is less than 1905 or enddate is greater than 1915 skip
                    if(exhibition.startyear < 1905 || exhibition.endyear > 1915) return;
                    
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

    getPercentage(exhibition: MetaExhibition, id?: number): number {
        if(!id) id = this.props.baseId;

        if(!exhibition) return 0;

        const totalArtworksExhibited = exhibition.exhibitsItems?.length;
        const artWorksByBaseArtist = exhibition.exhibitsItems?.filter((item: Item) => item.artistsCreated.find((artist: Artist) => artist.id === id)).length;

        // console.log(exhibition);
        // console.log(totalArtworksExhibited, artWorksByBaseArtist);
        // console.log('-------')

        // calculate percentage
        const percentage = (artWorksByBaseArtist / totalArtworksExhibited) * 100;

        return +percentage.toFixed(2);
    }

    sort(property: string) {
        // if length is requested, sort by length of array
        const sortBy = property.split('.')[0];
        let sorted = Array<MetaExhibition>();
        if(property.split('.')[1] === 'length') {
            sorted = _.sortBy(this.state.results.exhibitions, exhibition => {
                // if sortBy is artistsExhibited, return length of unique artists
                return _.uniqBy(exhibition[sortBy], (a: Artist) => a.id).length;
            });

            // if descending, reverse the array
            if(this.state.dir === 'desc') sorted.reverse();

            // use dir to sort ascending or descending
        } else {
            // else sort by property
            if(property === 'host') {
                sorted = _.sortBy(this.state.results.exhibitions, exhibition => {
                    return this.checkForHost(exhibition.tookPlaceAtLocations).place;
                });
            } else {
                sorted = _.sortBy(this.state.results.exhibitions, sortBy);
            }
            
            
            if(this.state.dir === 'desc') sorted.reverse();
            
            // use this.state.dir to sort ascending or descending
        }
        this.setState((prevState: any) => { return { ...prevState, results: { ...prevState.results, exhibitions: sorted } } })

        this.state.dir === 'asc' ? this.setState((prevState: any) => { return { ...prevState, dir: 'desc' } }) : this.setState((prevState: any) => { return { ...prevState, dir: 'asc' } });
    };

    exhibitionIsCommon(e: MetaExhibition): boolean {
        // create array of exhibition ids and isCommon property 
        return e.isCommon ? true : false;
    };

    getCountryAndCity(exhibition: MetaExhibition): string {
        if(exhibition.tookPlaceAtLocations.length === 0) return 'NA';
        return exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0].name + ' (' + exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0].country_code + ')';
    }

     /** Checks if there is a host, otherwise returns dummy host (for filling the table with data) */
    checkForHost(venues: Venue[]): Venue {
        const noVenue: Venue = {
            id: -1,
            place: "\\N",
            name: `NA`,
            place_tgn: `NA`,
            type: `NA`,
            heldExhibitions: []
        }

        if (venues[0]) {
            return venues[0];
        }
        else return noVenue;
    }

    reset() {
        // set isCommon to false for all exhibitions
        this.setState((prevState: any) => { 
            const exhibitions = new Array<MetaExhibition>();
            prevState.results.exhibitions?.forEach((exhibition: MetaExhibition) => {
                const metaExhibition: MetaExhibition = { ...exhibition, isCommon: false, percentBase: exhibition.percentBase };
                exhibitions.push(metaExhibition);
            });

            // sort by startyear
            exhibitions.sort((a: MetaExhibition, b: MetaExhibition) => {
                if(a.startyear < b.startyear) return -1;
                if(a.startyear > b.startyear) return 1;
                return 0;
            });

            return { ...prevState,  compareWith: null, results: { ...prevState.results, exhibitions: exhibitions } } 
        });
    }

    render() {
        return (
            <>
                <table className="text-left text-black">
                    <thead className="text-xs bg-black text-white uppercase sticky">
                        <tr>
                            {/* <th scope="col" className="px-6 py-3">
                                ID
                            </th> */}
                            <th scope="col" className="px-2 border-r border-gray-300">
                                <button onClick={() => this.sort('type')}>Type</button>
                            </th>
                            <th scope="col" className="px-2 border-r border-gray-300">
                                <button onClick={() => this.sort('startyear')}>Date</button>
                            </th>
                            {/* <th scope="col" className="px-2 border-r border-gray-300">
                                <button onClick={() => this.sort('enddate')}>End Date</button>
                            </th> */}
                            <th scope="col" className="px-2 py-2 border-r border-gray-300">
                                <button onClick={() => this.sort('host')}>City (Country)</button>
                            </th>
                            <th scope="col" className="px-2 border-r border-gray-300">
                                <button onClick={() => this.sort('title')}>Exhibition Title</button>
                            </th>
                            <th scope="col" className="px-2 border-r border-gray-300">
                                <button onClick={() => this.sort('catalogueEntriesEntryIn.length')}>Nr. Artworks</button>
                            </th>
                            <th scope="col" className="px-2 border-r border-gray-300">
                                <button onClick={() => this.sort('percentBase')}>Base Contribution</button>
                            </th>
                            { 
                            this.state.compareWith && <th scope="col" className="px-2 border-r border-gray-300">
                                <button onClick={() => this.sort('percentCompare')}>Compare Contribution</button>
                            </th> 
                            }
                            <th scope="col" className="px-2 border-r border-gray-300">
                                <button onClick={() => this.sort('artistsExhibitedAt.length')}>Artists</button>
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
                            <tr className={`${this.exhibitionIsCommon(exhibition) ? 'bg-amber-100' : 'bg-white'} border-b`} key={exhibition.id.toString()}>
                                {/* <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                    {exhibition.id}
                                </th> */}
                                <td className="px-2 text-center">
                                    
                                    {/* use fontawesome icons depending on type */}
                                    {exhibition.type === 'group' && <FontAwesomeIcon icon={faPeopleGroup} data-toggle="tooltip" title="Group Exhibition"/>}
                                    {exhibition.type === 'auction' && <FontAwesomeIcon icon={faGavel} data-toggle="tooltip" title="Auction"/>}
                                    {exhibition.type === 'solo' && <FontAwesomeIcon icon={faPerson} data-toggle="tooltip" title="Solo Exhibition" />}
                                </td>
                                <td className="px-2">{exhibition.startyear.toString()}</td>
                                <td className="px-2">{this.getCountryAndCity(exhibition)}</td>
                                {/* <td className="px-2">{this.checkForHost(exhibition.venuesHeldAt).place} ({this.checkForHost(exhibition.venuesHeldAt).place})</td> */}
                                {/* <td className="px-4">{exhibition.enddate}</td> */}
                                <td className="px-2">{exhibition.title}</td>
                                <td className="px-2 text-right">{exhibition.exhibitsItems && exhibition.exhibitsItems.length}</td>
                                <td className="px-2 text-right">{exhibition.percentBase}%</td>
                                {
                                    this.state.compareWith && <td className="px-2 text-right">{exhibition.percentCompare}%</td>
                                }
                                {/* <td className="px-2">{exhibition.tookPlaceInHosts && exhibition.tookPlaceInHosts.length}</td> */}
                                <td className="px-2 text-right">{exhibition.artistsExhibitedAt && _.uniqBy(exhibition.artistsExhibitedAt, (a: Artist) => a.id).length}</td>
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

export default TableComponent;