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


class ExhibitionsComponent extends React.Component<{ artist: Artist }, { artist: Artist, compareWith: Artist | null, baseNode: Node, links: Array<Link>, width: number, height: number }> {

	private showNetwork: boolean = false;
	private exhibitionNetwork = React.createRef<ExhibitionNetworkComponent>();
	private links: Array<Link>;
	private margin: { bottom: number, left: number, right: number, top: number };
	private width: number = 500;
	private height: number = 0;

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
		this.width = 500;
		this.height = 200;

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
		// get ego-net-container element width and height and set state
		const width = document.getElementById('artistinfo-container')?.clientWidth;
		const height = document.getElementById('artistinfo-container')?.clientHeight;

		if (!width || !height) return;

		this.setState(prevState => ({ width: width, height: height }), () => {
			console.log("onresize setstate");
			this.init();
		});
	}

	onArtistChange(artistId: string) {

		client.query({
			query: GET_ARTIST,
			variables: {
				searchId: artistId
			}
		}).then(result => {
			//TODO: get it to work 
			this.setState({ artist: result.data.artists[0] })

			console.log(result.data.artists[0])
			//this.setState(prevState => ({ artist: result.data.artists[0] }), () => { this.render() });
		});
	}

	componentDidMount(): void {
		console.log("comp did mount");
		// this.width = window.innerWidth * 0.6;

		// get ego-net-container element width and height and set state
		const width = document.getElementById('artistinfo-container')?.clientWidth;
		const height = document.getElementById('artistinfo-container')?.clientHeight;

		// TODO uncomment 
		if (!width || !height) return;

		this.setState(prevState => ({ width: width, height: height }), () => {
			console.log("setState in did mount");
			this.init();
		});

		// set resize handler to window
		window.addEventListener('resize', this.onResize);

		// this.init();
	}

	drawNetwork() {
		console.log("draw network");
		//console.log(this.state.artist);
		const source: Node = {
			id: this.state.artist.id,
			name: this.state.artist.firstname + ' ' + this.state.artist.lastname,
			type: 'artist',
			props: { data: this.state.artist }
		};

		console.log(this.state.artist.exhibitedWithArtists);
		let coexhibMap: Map<string, Set<{ year: number, exhibitionIds: Set<string> }>> = new Map<string, Set<{ year: number, exhibitionIds: Set<string> }>>();
		let exhibMap: Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number }>> = new Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number }>>();
		//this.state.artist.exhibitedWithArtists?.forEach((artist: Artist) => {
		this.state.artist.exhibitedExhibitions?.forEach((exhibition: Exhibition) => {
			// check if source artist also exhibited in this exhibition
			//const sourceExhibition = this.state.artist.exhibitedExhibitions?.find((ex: Exhibition) => ex.id === exhibition.id);

			//if (!sourceExhibition) return;

			const year = +exhibition.startdate;
			const key = `${exhibition.id}`;
			//const artworksCount = +1;

			if (exhibMap.has(key)) {


				const value = exhibMap.get(key) as Set<{ year: number, exhibition: Exhibition, artworksCount: number }>;

				const artwCount = Array.from(value).find((d: { year: number, exhibition: Exhibition, artworksCount: number }) => d.year === year);;

				const awCount = artwCount?.artworksCount;
				console.log("value: " + awCount);



				if (awCount) {
					let artworksCount = +awCount.toString();
					console.log("year: " + year + " exhibition: " + exhibition + " artworks: " + artworksCount);
					//value.delete({ year, exhibition, artworksCount });
					value.clear();
					artworksCount = artworksCount + 1;
					console.log("artworkscount " + artworksCount);
					value.add({ year, exhibition, artworksCount })
				}

				// const yearData = Array.from(value).find((d: { year: number, exhibition: Exhibition }) => d.year === year);

				// if (yearData) {
				// 	yearData.exhibIds.add(exhibition.id);
				// } else {
				// 	value.add({ year, exhibition });
				// } 
			} else {
				const artworksCount = 1;
				exhibMap.set(key, new Set<{ year: number, exhibition: Exhibition, artworksCount: number }>([{ year, exhibition, artworksCount }]));
			}
		});
		//});

		console.log("exhib map");
		console.log(exhibMap);
		let i: number = 0;

		exhibMap.forEach((value: Set<{ year: number, exhibition: Exhibition, artworksCount: number }>, key: string) => {
			//const found: Artist | undefined = this.state.artist.exhibitedWithArtists?.find((artist: Artist) => `${artist.id}` === key);

			//console.log("exhibmap foreach");
			//console.log(value, key);
			/* if (!found) {
				console.log(key + ' not found');
				return;
			} */

			value.forEach((item: { year: number, exhibition: Exhibition, artworksCount: number }) => {


				console.log("map value foreach");
				console.log(item.exhibition);

				//TODO: CHANGE type to exhibition
				const target: Node = {
					id: item.exhibition.id,
					name: item.exhibition.title,
					type: 'artist',
					//props: { data: item.exhibition }

					//TODO: maybe delete artist (not possible atm because of ego-network dependencies)
					props: { data: this.state.artist, exhibition: item.exhibition }
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
							count: item.artworksCount
						}
					},
					source: source,
					target: target
				};

				this.links.push(link);



			});




			//});
		});

		console.log(this.links);
		console.log(source);

		//this.setState(prevState => ({ baseNode: source, links: this.links }), this.readyToDrawNetwork);

		/* 		const target: Node = {
					id: '187',
					name: 'Exhibition Test',
					type: 'artist',
					props: { data: this.state.artist }
				};
		
				const target2: Node = {
					id: '3',
					name: 'Exhibition Test 2',
					type: 'artist',
					props: { data: this.state.artist }
				};
		
		
				const link: Link = {
					sourceId: `${source.id}`,
					targetId: `${target.id}`,
					props: {
						data: {
							year: 1915,
							count: 85
						}
					},
					source: source,
					target: target
				};
		
				this.links.push(link);
		
				const link2: Link = {
					sourceId: `${source.id}`,
					targetId: `${target2.id}`,
					props: {
						data: {
							year: 1914,
							count: 65
						}
					},
					source: source,
					target: target2
				};
		
				this.links.push(link2); */


		this.setState(prevState => ({ baseNode: source, links: this.links }), this.readyToDrawNetwork);


	}

	/** get number of exhibitions without counting repetitions */
	getUniqueExhibitions(exhibitions?: Array<Exhibition>): number {
		if (!exhibitions) return 0;

		const uniqueExhibitions = Array.from(new Set(exhibitions));

		return uniqueExhibitions.length;
	}

	readyToDrawNetwork() {
		this.showNetwork = true;
		console.log("ready to draw network");
		this.forceUpdate();
	}

	render() {
		return (
			<>
				<div className="fixed w-[94%] h-auto z-50">
					<div className="w-10/12 h-auto flex-col justify-center mx-auto">
						<SearchComponent query={GET_ARTIST_BY_NAME} onClick={this.onClick}></SearchComponent>
					</div>
				</div>


				{this.state.artist &&

					<div className="grid grid-flow-row-dense lg:grid-cols-5 lg:grid-rows-4 gap-1 sm:grid-cols-1 md:grid-rows-3 pt-20 w-full h-[95vh]">
						<div className="row-span-1 col-span-2 z-40">
							<div className="w-full h-[50vh]" id="artistinfo-container">
								<div className="float-left text-left pl-2">
									<h1 className="lg:text-xl sm:text-md font-semibold border-b-2 border-gray-500 border-solid">{this.state.artist.firstname} {this.state.artist.lastname} ({this.state.artist.country})</h1>
									<h2 className="lg:text-md sm:text-sm font-medium">{(this.state.artist.birthdate?.toString().substring(0, 4))} ({this.state.artist.birthplace}) - {(this.state.artist.deathdate?.toString().substring(0, 4))} ({this.state.artist.deathplace})</h2>
									<h3 className="lg:text-sm sm:text-xs font-normal text-gray">{this.getUniqueExhibitions(this.state.artist.exhibitedExhibitions)} exhibitions | {this.state.artist.exhibitedExhibitions?.length} artworks</h3>
								</div>
							</div>
						</div>

						<div className="lg:row-span-4 md:row-span-1 lg:col-span-3 sm:col-span-1 z-40">
							<div className="w-full h-[90vh] sm:h-full" id="ego-net-container">
								{this.showNetwork &&
									<ExhibitionNetworkComponent ref={this.exhibitionNetwork} baseNode={this.state.baseNode} links={this.state.links} requestNode={this.onArtistChange.bind(this)} />
								}
							</div>
						</div>

						<div className="lg:row-span-3 md:row-span-1 col-span-2 z-30">
							<div className="w-full h-full overflow-y-scroll" id="table-container">
								<EHTableComponent query={GET_EXHIBITION} baseId={this.state.artist.id} compareWith={null} exhibitions={this.state.artist.exhibitedExhibitions} />
							</div>
						</div>
					</div>
				}
			</>
		);
	}
};

export default ExhibitionsComponent;