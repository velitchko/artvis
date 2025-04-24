import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import { Location } from '../../models/location.model';
import GET_EXHIBITION from '../../queries/exhibition';
import SearchComponent from '../search/search';
import GET_ARTIST_BY_NAME from '../../queries/artistByName';
import client from '../apollo/client';
import GET_ARTIST from '../../queries/artist';
import { Link } from '../../models/link';
import { Node } from '../../models/node';
import EHTableComponent from '../table/exhibition.host.table';
import ExhibitionNetworkComponent from '../network/exhibition.network';
import { Venue } from '../../models/venue.model';
import GET_EXHIBITIONS_BY_ARTIST from '../../queries/exhibitionsByArtist';
import ExhibitionMapComponent from '../map/exhibition.map';
import GET_EXHIBITIONS_AND_HOSTS from '../../queries/exhibitonsAndHosts';
import { Item } from '../../models/item.model';
import { Host } from '../../models/host.model';
import ExhibitionLinechartComponent from '../linechart/exhibition.linechart';
import GET_ARTIST_AND_CATALOGUES from '../../queries/artistWithCatalogues';
import GET_ARTIST_EXHIBITIONS_BY_ID from '../../queries/artistExhibitionsById';
import GET_EXHIBITIONS_FOR_GROUPS from '../../queries/exhibitionsForGroups';

type MetaExhibition = Exhibition & { isCommon: boolean, artworksTotal: number, artworksBase: number, percentCompare: number, percentBase: number };


class GroupsComponent extends React.Component<{ artists: Array<Artist>, exhibitions: Array<Exhibition> }, { artists: Array<Artist>, exhibitions: Array<Exhibition>, compareWith: Artist | null, baseNode: Node, links: Array<Link>, baseNumberOfArtworks: number, compareNumberOfArtworks: number, width: number, height: number }> {

	private showNetwork: boolean = false;
	private exhibitionNetwork = React.createRef<ExhibitionNetworkComponent>();
	private links: Array<Link>;
	private margin: { bottom: number, left: number, right: number, top: number };
	private width: number = 500;
	private height: number = 0;
	//private exhibMap: Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>;
	private exhibMap: Map<string, Set<{ year: number, exhibition: Exhibition, baseLength: number, entries: number, percentage: number }>>;
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
	private artistColor: string;
	private artistlist: Array<Artist>;
	private coexhiblist: Map<string, Array<BigInt>>;
	private genderlist: Map<string, Array<BigInt>>;
	private countrylist: Map<string, Array<BigInt>>;
	private exhibitionlist: Array<Exhibition>;
	private countries: Array<string>;
	private artworkExhibitionList: Map<string, number>;
	private normalizedMap: Map<string, Array<number>>;


	constructor(props: { artists: Array<Artist>, exhibitions: Array<Exhibition>, compareWith: Artist | null, baseNode: Node, links: Array<Link> }) {
		super(props);

		this.state = {
			artists: props.artists,
			exhibitions: props.exhibitions,
			baseNode: {} as Node,
			links: new Array<Link>(),
			baseNumberOfArtworks: 0,
			compareNumberOfArtworks: 0,
			width: 0,
			height: 0,
			compareWith: null
		};


		//console.log(this.state.exhibitions[0]);

		this.links = new Array<Link>();
		this.exhibStatistics = new Array<MetaExhibition>();
		this.exhibMap = new Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>();
		this.coexhiblist = new Map<string, Array<BigInt>>();
		this.genderlist = new Map<string, Array<BigInt>>();
		this.countrylist = new Map<string, Array<BigInt>>();
		this.artworkExhibitionList = new Map<string, number>();
		this.normalizedMap = new Map<string, Array<number>>();
		//this.exhibitionlist = new Array<Exhibition>();
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
		this.artistColor = "#1f77b4";

		this.artistlist = this.state.artists;
		this.exhibitionlist = this.state.exhibitions;

		this.countries = ["GB", "NL", "RU", "CH", "US", "FR", "IT", "UA", "DE", "CZ", "HU", "RO", "AU", "BE", "BY", "LT", "AT", "NO", "SE", "FI", "ES", "PL", "BG", "GE", "MX", "AM", "IL", "PT", "DK", "IE", "HR", "CL", "SK", "GR", "AR", "LV", "CA", "DO", "PE", "JP", "RS", "TR", "SI", "EE", "BR", "ZA", "LU", "NZ", "VE", "GT", "UY", "SV", "PY", "BA", "IN", "ME"];


		console.log("artists");
		console.log(this.artistlist[0]);

		console.log("exhibitions");
		console.log(this.exhibitionlist[0]);

		this.margin = {
			top: 30,
			bottom: 30,
			left: 30,
			right: 30
		};
		this.init();
	}

	init() {
		console.log("init");
		//console.log(this.state.artists[0]);

		this.computeAdjacencylist();

		this.computeGenderVectors();

		this.computeCountryVector();

		this.computeArtworkExhibitions();


		let birthyears = new Array<number>();

		this.artistlist.forEach((artist) => {
			birthyears.push(artist.birthyear);
		});

		//console.log(birthyears);

		const meanyear = birthyears.reduce((sum, currentValue) => sum + currentValue, 0) / birthyears.length;
		const stdDev = Math.sqrt(birthyears.reduce((sum, val) => sum + Math.pow(val - meanyear, 2), 0) / birthyears.length);

		this.artistlist.forEach((artist) => {

			const artistId = artist.id;

			let normalized = new Array(4).fill(0);

			if (artistId) {
				normalized[0] = (this.normalizeBirthyear(artist.birthyear, meanyear, stdDev));

				this.normalizedMap.set(artistId.toString(), normalized);
			}

		});

		console.log("normalized");
		console.log(this.normalizedMap);

		//this.loadExhibitions();

		//console.log(this.exhibitionlist[0]);

		//this.computeGenderVectors();
	}

	computeAdjacencylist() {
		this.artistlist.forEach((artist) => {
			const artistId = artist.id;
			let adjList = new Array(14001).fill(0);
			//console.log(artistId);

			artist.coExhibitedTotalArtists?.forEach((artist) => {

				adjList[artist.id] = 1;
			});

			if (artistId) {
				this.coexhiblist.set(artistId.toString(), adjList);
			}
		});

		let one = '5'; //why is id nr 4 missing in co-exhibitors?
		//console.log(this.coexhiblist.get(one));
	}

	//one hot vector for gender
	computeGenderVectors() {
		//vector: [0, 1] = [M, F]

		this.artistlist.forEach((artist) => {
			const artistId = artist.id;
			let genderVec = new Array(2).fill(0);
			//console.log(artistId);

			if (artist.sex) {
				if (artist.sex == 'M') {
					genderVec[0] = 1;
				}
				else if (artist.sex == 'F') {
					genderVec[1] = 1;
				}
			}

			if (artistId) {
				this.genderlist.set(artistId.toString(), genderVec);
			}
		});

		let one = '5';
		//console.log(this.genderlist.get(one));

	}

	//one-hot vector for artist nationalities
	computeCountryVector() {

		this.artistlist.forEach((artist) => {
			const artistId = artist.id;
			let countryVec = new Array(this.countries.length).fill(0);
			//console.log(artistId);

			if (artist.country) {
				let index = this.countries.indexOf(artist.country);
				countryVec[index] = 1;
			}

			if (artistId) {
				this.countrylist.set(artistId.toString(), countryVec);
			}
		});

		let one = '5';
		//console.log(this.countrylist.get(one));


	}

	loadExhibitions() {
		console.log("load exhibitions");

		client.query({
			//query: GET_ARTIST,
			query: GET_EXHIBITIONS_FOR_GROUPS,

		}).then(result => {

			console.log("resuts");
			console.log(result);
			console.log(result.data);
			console.log("resultdata");
			console.log(result.data[0]);
			this.exhibitionlist = result.data;

		});
	}

	//compute for each artist (# exhibited artworks/ # exhibitions)*100
	computeArtworkExhibitions() {

		this.artistlist.forEach((artist) => {
			const artistId = artist.id;

			let artworkExhibitions = 0;


			if (artist.exhibitedAtExhibitions && artist.exhibitedAtExhibitions.length != 0) { //not supposed to be null or zero because of the division
				const numberExhibitions = artist.exhibitedAtExhibitions?.length;

				let numberOfArtworks = 0;
				let exhibitedItemsTotal = 0;

				this.exhibitionlist.forEach((exhibition) => {
					let exhibited = false;
					let n = numberOfArtworks;
					exhibition.exhibitsItems.forEach((i: Item) => {
						numberOfArtworks += i.artistsCreated.filter((a: Artist) => a.id === (artistId)).length;

						if (n != numberOfArtworks) {
							exhibited = true;
						}
					})

					if (exhibited) {
						exhibitedItemsTotal += exhibition.exhibitsItems.length;
					}

				});

				artworkExhibitions = numberOfArtworks / exhibitedItemsTotal * 100;

				this.artworkExhibitionList.set(artistId.toString(), artworkExhibitions);
			}


		});

		let one = '2';
		//console.log("artworks + exhibitions");
		//console.log(this.artworkExhibitionList.get(one));

	}


	normalizeBirthyear(year: number, mean: number, stddev: number): number {
		let normalized = 0;

		normalized = (year - mean) / stddev;

		return normalized;
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

	componentDidMount(): void {
		//console.log("comp did mount");
		// this.width = window.innerWidth * 0.6;

		// get ego-net-container element width and height and set state
		const width = document.getElementById('artistinfo-container')?.clientWidth;
		const height = document.getElementById('artistinfo-container')?.clientHeight;

		if (!width || !height) return;

		//this.getNumberOfArtworks(true);

		this.setState(prevState => ({ width: width, height: height }), () => {
			//console.log("setState in did mount");
			this.init();
		});

		// set resize handler to window
		window.addEventListener('resize', this.onResize);

		// this.init();
	}



	/** get number of exhibitions without counting repetitions */
	getUniqueExhibitions(exhibitions?: Array<Exhibition>): number {
		if (!exhibitions) return 0;

		const uniqueExhibitions = Array.from(new Set(exhibitions));

		return uniqueExhibitions.length;
	}

	/* getNumberOfArtworks(base: boolean = true): void {
		client.query({
			query: GET_ARTIST_EXHIBITIONS_BY_ID,
			variables: {
				searchId: base ? this.state.artist.id : this.state.compareWith?.id
			}
		}).then(result => {
			let numberOfArtworks = 0;

			result.data.artists[0].exhibitedAtExhibitions
				.forEach((exhibition: Exhibition) => {
					exhibition.exhibitsItems.forEach((i: Item) => {
						numberOfArtworks += i.artistsCreated.filter((artist: Artist) => artist.id === (base ? this.state.artist.id : this.state.compareWith?.id)).length;
					})
				});

			if (base) {
				this.setState({ baseNumberOfArtworks: numberOfArtworks });
			} else {
				this.setState({ compareNumberOfArtworks: numberOfArtworks });
			}
		});
	}
 */
	/** get number of common exhibitions of 2 artists */
	getCommonExhibitionNumber(compareWith?: Artist): number {
		if (!compareWith) return 0;
		let count = 0;

		this.links.forEach((l: Link) => {
			const link = compareWith?.exhibitedAtExhibitions?.find((e: Exhibition) => l.target.id === e.id);

			if (link) count++;
		});

		return count;
	}

	//<div className="row-span-1 col-span-2 z-40">
	//<div className="w-full h-[10vh]" id="artistinfo-container">
	//							<div className="float-left text-left pl-2"></div>

	render() {
		return (
			<>
				<div className="fixed w-[94%] h-auto z-50">
					<div className="w-10/12 h-auto flex-col justify-center mx-auto">
						<SearchComponent query={GET_ARTIST_BY_NAME} ></SearchComponent>
					</div>
				</div>

			</>
		);
	}


};

export default GroupsComponent;