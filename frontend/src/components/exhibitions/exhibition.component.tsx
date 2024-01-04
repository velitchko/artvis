import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import GET_EXHIBITION from '../../queries/exhibition';
import SearchComponent from '../search/search';
import GET_ARTIST_BY_NAME from '../../queries/artistByName';
import client from '../apollo/client';
import GET_ARTIST from '../../queries/artist';
import { Link } from '../../models/link';
import { Node } from '../../models/node';
import EHTableComponent from '../table/exhibition.host.table';
import ExhibitionNetworkComponent from '../network/exhibition.network';
import { Host } from '../../models/host.model';
import GET_EXHIBITIONS_BY_ARTIST from '../../queries/exhibitionsByArtist';
import ExhibitionMapComponent from '../map/exhibition.map';
import GET_EXHIBITIONS_AND_HOSTS from '../../queries/exhibitonsAndHosts';
import { CatalogueEntry } from '../../models/catalogueEntry.model';

type MetaExhibition = Exhibition & { isCommon: boolean, artworksTotal: number, artworksBase: number, percentCompare: number, percentBase: number };

class ExhibitionsComponent extends React.Component<{ artist: Artist }, { artist: Artist, compareWith: Artist | null, baseNode: Node, links: Array<Link>, width: number, height: number }> {

	private showNetwork: boolean = false;
	private exhibitionNetwork = React.createRef<ExhibitionNetworkComponent>();
	private links: Array<Link>;
	private margin: { bottom: number, left: number, right: number, top: number };
	private width: number = 500;
	private height: number = 0;
	private exhibMap: Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>;
	private exhibStatistics: Array<MetaExhibition>;
	private baseItemCountExtentAbs: [number, number];
	private baseItemCountExtentAvg: [number, number];
	private compareItemCountExtentAbs: [number, number];
	private compareItemCountExtentAvg: [number, number];
	private minYear: number = 0;
	private maxYear: number = 0;
	private yScale: d3.ScaleLinear<number, number, never> | undefined;
	private xScale: d3.ScaleLinear<number, number, never> | undefined;
	private loadingExternalData: boolean = false;


	constructor(props: { artist: Artist, compareWith: Artist | null, baseNode: Node, links: Array<Link> }) {
		super(props);

		this.state = {
			artist: props.artist,
			baseNode: {} as Node,
			links: new Array<Link>(),
			width: 0,
			height: 0,
			compareWith: null
		};

		this.links = new Array<Link>();
		this.exhibStatistics = new Array<MetaExhibition>();
		this.exhibMap = new Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>();
		this.width = 500;
		this.height = 200;

		this.baseItemCountExtentAbs = [0, 0];
		this.baseItemCountExtentAvg = [0, 0];
		this.compareItemCountExtentAbs = [0, 0];
		this.compareItemCountExtentAvg = [0, 0];
		this.minYear = 1905;
		this.maxYear = 1915;
		this.yScale = undefined;
		this.xScale = undefined;


		this.margin = {
			top: 30,
			bottom: 30,
			left: 30,
			right: 30
		};
	}

	init() {
		console.log("init");
		this.drawNetwork();
	}

	onClick = (event: any) => {
		this.onArtistChange(event);
	}

	onResize = () => {
		// get artistinfo-container element width and height and set state
		const width = document.getElementById('artistinfo-container')?.clientWidth;
		const height = document.getElementById('artistinfo-container')?.clientHeight;

		if (!width || !height) return;

		this.setState(prevState => ({ width: width, height: height }), () => {
			//console.log("onresize setstate");
			this.init();
		});
	}


	onArtistChange(artistId: string) {
		// client.query({
		// 	query: GET_ARTIST,
		// 	variables: {
		// 		searchId: artistId
		// 	}
		// }).then(result => {
		// 	//TODO: get it to work 
		// 	this.setState({ artist: result.data.artists[0] })

		// 	//console.log(result.data.artists[0])
		// 	//this.setState(prevState => ({ artist: result.data.artists[0] }), () => { this.render() });
		// });

		this.setState({ compareWith: null });

		const artist = this.state.artist.exhibitedWithArtists?.find((artist: Artist) => artist.id === artistId);

		if (artist) {
			// this.setState({ compareWith: artist });
			this.setState(prevState => ({ compareWith: artist }), () => {
				//this.drawCompare();
				//this.exhibitionNetwork.current?.highlightArtist(this.state.compareWith);
				this.exhibitionNetwork.current?.highlightCommonExhibitions(this.state.compareWith);
			});
			// this.drawCompare();
		} else {
			console.log('artist not found');
			this.loadingExternalData = true;
			// query artist by id
			client.query({
				query: GET_ARTIST,
				variables: {
					searchId: artistId
				}
			}).then(result => {
				this.setState(prevState => ({ compareWith: result.data.artists[0] }), () => {
					//this.drawCompare();
					//this.exhibitionNetwork.current?.highlightArtist(this.state.compareWith);
					this.exhibitionNetwork.current?.highlightCommonExhibitions(this.state.compareWith);
				});
				this.loadingExternalData = false;
			});

		}
	}




	componentDidMount(): void {
		//console.log("comp did mount");
		// this.width = window.innerWidth * 0.6;

		// get ego-net-container element width and height and set state
		const width = document.getElementById('artistinfo-container')?.clientWidth;
		const height = document.getElementById('artistinfo-container')?.clientHeight;

		if (!width || !height) return;

		this.setState(prevState => ({ width: width, height: height }), () => {
			//console.log("setState in did mount");
			this.init();
		});

		// set resize handler to window
		window.addEventListener('resize', this.onResize);

		// this.init();
	}

	drawNetwork() {
		//console.log("draw network");
		//console.log(this.state.artist);
		const source: Node = {
			id: this.state.artist.id,
			name: this.state.artist.firstname + ' ' + this.state.artist.lastname,
			type: 'artist',
			props: { data: this.state.artist }
		};

		//console.log(this.state.artist.exhibitedWithArtists);
		let coexhibMap: Map<string, Set<{ year: number, exhibitionIds: Set<string> }>> = new Map<string, Set<{ year: number, exhibitionIds: Set<string> }>>();
		//let exhibMap: Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>> = new Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>();
		//this.state.artist.exhibitedWithArtists?.forEach((artist: Artist) => {


		//put exhibitions into a map with exhibition id as key and compute the number of artworks in each exhibition
		this.state.artist.exhibitedExhibitions?.forEach((exhibition: Exhibition) => {
			// check if source artist also exhibited in this exhibition
			//const sourceExhibition = this.state.artist.exhibitedExhibitions?.find((ex: Exhibition) => ex.id === exhibition.id);

			//if (!sourceExhibition) return;

			const year = +exhibition.startdate;
			const key = `${exhibition.id}`;
			//const artworksCount = +1;

			const baseLength = exhibition.catalogueEntriesEntryIn?.filter((entry: CatalogueEntry) => entry.id_person !== '\\N').length;

			//TODO: entries == artworksCount but easier computation. --> remove artworksCount + rename entries to artworksCount
			// get amount of catalogueEntries with id_person === id
			const entries = exhibition.catalogueEntriesEntryIn?.filter((entry: CatalogueEntry) => entry.id_person === this.state.artist.id)?.length;

			// calculate percentage
			const percentage = (entries / baseLength) * 100;

			//console.log("base " + baseLength);
			//console.log("entries " + entries);
			//console.log("percent " + percentage);

			//if the exhibition id is already in the map, increase artworks count by 1
			if (this.exhibMap.has(key)) {

				const value = this.exhibMap.get(key) as Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>;

				const artwCount = Array.from(value).find((d: { year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }) => d.year === year);;

				const awCount = artwCount?.artworksCount;

				if (awCount) {
					let artworksCount = +awCount.toString();
					//console.log("year: " + year + " exhibition: " + exhibition + " artworks: " + artworksCount);
					//value.delete({ year, exhibition, artworksCount });
					value.clear();
					artworksCount = artworksCount + 1;
					//console.log("artworkscount " + artworksCount);
					value.add({ year, exhibition, artworksCount, baseLength, entries, percentage })
				}

				// const yearData = Array.from(value).find((d: { year: number, exhibition: Exhibition }) => d.year === year);

				// if (yearData) {
				// 	yearData.exhibIds.add(exhibition.id);
				// } else {
				// 	value.add({ year, exhibition });
				// } 

				//if the exhibition isn't in the map yet, put it in the map
			} else {
				const artworksCount = 1;
				this.exhibMap.set(key, new Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>([{ year, exhibition, artworksCount, baseLength, entries, percentage }]));
			}
		});
		//});

		console.log("exhib map");
		console.log(this.exhibMap);
		let i: number = 0;

		//if the links from artist to exhibitions have not been set yet
		if (this.links.length === 0) {
			this.exhibMap.forEach((value: Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>, key: string) => {
				//const found: Artist | undefined = this.state.artist.exhibitedWithArtists?.find((artist: Artist) => `${artist.id}` === key);

				//console.log("exhibmap foreach");
				//console.log(value, key);
				/* if (!found) {
					console.log(key + ' not found');
					return;
				} */



				//console.log("exhibmap foreach");


				//fill in missing hosts and create links
				value.forEach((item: { year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }) => {

					const exhib: MetaExhibition = { ...item.exhibition, artworksTotal: item.baseLength, artworksBase: item.artworksCount, isCommon: false, percentBase: item.percentage, percentCompare: 0 };

					this.exhibStatistics.push(exhib);


					//console.log("map value foreach");
					let hosts: Host[] = [];

					//if the exhibition already has hosts, set them as hosts
					if (item.exhibition.tookPlaceInHosts[0]) {

						hosts = [...item.exhibition.tookPlaceInHosts];
						//console.log(hosts[0].country);
					}
					//if the exhibition does not have hosts, insert a dummy host
					else {
						const noHost: Host = {
							id: `-1`,
							country: "\\N",
							name: `NA`,
							latitude: `-999999999`,
							longitude: `-999999999`,
							place: `NA`,
							place_tgn: `NA`,
							town: `NA`,
							type: `NA`,
							exhibitionsTookPlaceIn: []
						}
						console.log("tookplaceinhosts " + item.exhibition.tookPlaceInHosts);
						hosts = [noHost];
						//console.log("nohosts " + noHosts[0].country);
						//item.exhibition.tookPlaceInHosts = noHosts;
						//noHosts.push(noHost);
						//console.log("nohosts " + noHosts[1].country);
						//item.exhibition.tookPlaceInHosts.push(noHost);

						//item.exhibition.tookPlaceInHosts[0] = noHost;
						//console.log(item.exhibition.tookPlaceInHosts[0].country);
					}

					//TODO: CHANGE type to exhibition
					const target: Node = {
						id: item.exhibition.id,
						name: item.exhibition.title,
						type: 'artist',
						//props: { data: item.exhibition }

						//TODO: maybe delete artist (not possible atm because of ego-network dependencies)
						props: { data: this.state.artist, exhibition: item.exhibition, hosts: hosts }
					};

					//console.log("artist:");
					//console.log(this.state.artist);

					// iterate over value set
					//value.forEach((item: { year: number, exhibitionIds: Set<string> }) => {

					//item.exhibitionIds.forEach((exid: string) => {

					/* const target: Node = {
						id: exid,
						name: found.firstname + ' ' + found.lastname,
						type: 'artist',
						props: { data: found }
					}; */


					const link: Link = {
						sourceId: `${source.id}`,
						targetId: `${target.id}`,
						props: {
							data: {
								year: item.year,
								count: item.artworksCount,
								baseLength: item.baseLength,
								percentage: item.percentage
							}
						},
						source: source,
						target: target
					};

					//console.log("push link");
					this.links.push(link);

				});

				//});
			});
		}
		//console.log(this.links);
		//console.log(source);
		console.log("component statistics")
		console.log(this.exhibStatistics);

		//this.setState(prevState => ({ baseNode: source, links: this.links }), this.readyToDrawNetwork);

		this.setState(prevState => ({ baseNode: source, links: this.links }), this.readyToDrawNetwork);
	}

	/** get number of exhibitions without counting repetitions */
	getUniqueExhibitions(exhibitions?: Array<Exhibition>): number {
		if (!exhibitions) return 0;

		const uniqueExhibitions = Array.from(new Set(exhibitions));

		return uniqueExhibitions.length;
	}

	/** get number of common exhibitions of 2 artists */
	getCommonExhibitionNumber(compareWith?: Artist): number {
		if (!compareWith) return 0;
		let count = 0;

		this.links.forEach((l: Link) => {
			const link = compareWith?.exhibitedExhibitions?.find((e: Exhibition) => l.target.id === e.id);

			if (link) count++;
		});

		return count;
	}

	readyToDrawNetwork() {
		this.showNetwork = true;
		//console.log("ready to draw network");
		this.forceUpdate();
	}

	//<div className="row-span-1 col-span-2 z-40">
	//<div className="w-full h-[10vh]" id="artistinfo-container">
	//							<div className="float-left text-left pl-2"></div>
	render() {
		return (
			<>
				<div className="fixed w-[94%] h-auto z-50">
					<div className="w-10/12 h-auto flex-col justify-center mx-auto">
						<SearchComponent query={GET_ARTIST_BY_NAME} onClick={this.onClick}></SearchComponent>
					</div>
				</div>


				{this.state.artist &&

					<div className="grid grid-flow-row-dense lg:grid-cols-4 lg:grid-rows-6 gap-1 sm:grid-cols-1 md:grid-rows-3 pt-20 w-full h-[95vh]">
						<div className="row-span-1 col-span-2 z-30">
							<div className="w-full h-[14vh]" id="artistinfo-container">
								<div className="float-left text-left pl-2">
									<h1 className="lg:text-xl sm:text-md font-semibold border-b-2 border-gray-500 border-solid">{this.state.artist.firstname} {this.state.artist.lastname} ({this.state.artist.country})</h1>
									<h2 className="lg:text-md sm:text-sm font-medium">{(this.state.artist.birthdate?.toString().substring(0, 4))} ({this.state.artist.birthplace}) - {(this.state.artist.deathdate?.toString().substring(0, 4))} ({this.state.artist.deathplace})</h2>
									<h3 className="lg:text-sm sm:text-xs font-normal text-gray">{this.getUniqueExhibitions(this.state.artist.exhibitedExhibitions)} exhibitions | {this.state.artist.exhibitedExhibitions?.length} artworks</h3>
								</div>
								{this.state.compareWith &&
									<div className="float-right text-right pr-2">
										<h1 className="lg:text-xl sm:text-md font-semibold border-b-2 border-gray-500 border-dashed">{this.state.compareWith.firstname} {this.state.compareWith.lastname} ({this.state.compareWith.country})</h1>
										<h2 className="lg:text-md sm:text-sm font-medium">{this.state.compareWith.birthdate?.toString().substring(0, 4)} ({this.state.compareWith.birthplace}) - {this.state.compareWith.deathdate?.toString().substring(0, 4)} ({this.state.compareWith.deathplace})</h2>
										<h3 className="lg:text-sm sm:text-xs font-normal text-gray">{this.getUniqueExhibitions(this.state.compareWith.exhibitedExhibitions)} exhibitions | {this.state.compareWith.exhibitedExhibitions?.length} artworks</h3>

									</div>
								}
								{this.state.compareWith &&

									<div className="h-[100%] text-center">
										<h3 className="lg:text-sm sm:text-xs font-normal text-gray">{this.getCommonExhibitionNumber(this.state.compareWith)} common <br />exhibitions</h3>
									</div>

								}
							</div>
						</div>

						<div className="lg:row-span-6 md:row-span-1 lg:col-span-2 sm:col-span-1 z-40">
							<div className="w-full h-[90vh] sm:h-full" id="ego-net-container">
								{this.showNetwork &&
									<ExhibitionNetworkComponent ref={this.exhibitionNetwork} baseNode={this.state.baseNode} links={this.state.links} requestNode={this.onArtistChange.bind(this)} />
								}
							</div>
						</div>

						<div className="lg:row-span-2 md:row-span-1 col-span-2 z-30">
							<div className="w-full h-full overflow-y-scroll overflow-x-scroll" id="table-container">
								<EHTableComponent query={GET_EXHIBITIONS_AND_HOSTS} baseId={this.state.artist.id} compareWith={this.state.compareWith} exhibitions={this.state.artist.exhibitedExhibitions} />
							</div>
						</div>
						<div className="lg:row-span-3 md:row-span-1 col-span-2 z-30">
							<div className="w-full h-full" id="map-container">
								{this.showNetwork &&
									<ExhibitionMapComponent compareWith={this.state.compareWith} exhibStatistics={this.exhibStatistics} exhibitions={this.state.artist.exhibitedExhibitions} />
								}
							</div>
						</div>
					</div>
				}
			</>
		);
	}
};

export default ExhibitionsComponent;