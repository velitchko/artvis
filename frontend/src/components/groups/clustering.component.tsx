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
//import * as fs from "fs";
import { UMAP } from 'umap-js';

type MetaExhibition = Exhibition & { isCommon: boolean, artworksTotal: number, artworksBase: number, percentCompare: number, percentBase: number };


class ClusteringComponent extends React.Component<{ matrix: number[][], numberVectors: number }, { matrix: number[][], numberVectors: number, width: number, height: number }> {

	private showNetwork: boolean = false;
	private exhibitionNetwork = React.createRef<ExhibitionNetworkComponent>();
	//private links: Array<Link>;
	private margin: { bottom: number, left: number, right: number, top: number };
	private width: number = 500;
	private height: number = 0;
	//private exhibMap: Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>;
	//private exhibMap: Map<string, Set<{ year: number, exhibition: Exhibition, baseLength: number, entries: number, percentage: number }>>;
	//private exhibStatistics: Array<MetaExhibition>;
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
	//private artistlist: Array<Artist>;
	//private coexhiblist: Map<string, Array<number>>;
	//private genderlist: Map<string, Array<number>>;
	//private countrylist: Map<string, Array<number>>;
	//private exhibitionlist: Array<Exhibition>;
	private countries: Array<string>;
	//private artworkExhibitionList: Map<string, number>;
	//private normalizedMap: Map<string, Array<number>>;
	//private featureVectors: Map<string, Array<number>>;
	private featureMatrix: number[][];
	private nVectors: number;



	constructor(props: { matrix: number[][], numberVectors: number }) {
		super(props);

		this.state = {
			matrix: props.matrix,
			//exhibitions: props.exhibitions,
			//baseNode: {} as Node,
			//links: new Array<Link>(),
			//baseNumberOfArtworks: 0,
			//compareNumberOfArtworks: 0,
			width: 0,
			height: 0,
			//compareWith: null
			numberVectors: props.numberVectors
		};


		//console.log(this.state.exhibitions[0]);

		//this.links = new Array<Link>();
		//this.exhibStatistics = new Array<MetaExhibition>();
		//this.exhibMap = new Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>();
		//this.coexhiblist = new Map<string, Array<number>>();
		//this.genderlist = new Map<string, Array<number>>();
		//this.countrylist = new Map<string, Array<number>>();
		//this.artworkExhibitionList = new Map<string, number>();
		//this.normalizedMap = new Map<string, Array<number>>();
		//this.featureVectors = new Map<string, Array<number>>();
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

		this.featureMatrix = this.state.matrix;
		this.nVectors = this.state.numberVectors;

		//this.artistlist = this.state.artists;
		//this.exhibitionlist = this.state.exhibitions;

		this.countries = ["GB", "NL", "RU", "CH", "US", "FR", "IT", "UA", "DE", "CZ", "HU", "RO", "AU", "BE", "BY", "LT", "AT", "NO", "SE", "FI", "ES", "PL", "BG", "GE", "MX", "AM", "IL", "PT", "DK", "IE", "HR", "CL", "SK", "GR", "AR", "LV", "CA", "DO", "PE", "JP", "RS", "TR", "SI", "EE", "BR", "ZA", "LU", "NZ", "VE", "GT", "UY", "SV", "PY", "BA", "IN", "ME"];


		console.log("matrix");
		console.log(this.featureMatrix[0]);
		//console.log(this.artistlist[0]);

		//console.log("exhibitions");
		//console.log(this.exhibitionlist[0]);

		this.margin = {
			top: 30,
			bottom: 30,
			left: 30,
			right: 30
		};
		this.init();
	}

	init() {
		console.log("init clustering");
		//console.log(this.state.artists[0]);

		const umap = new UMAP();

		console.log("embedding");
		//console.log(this.featureVectors.get(one));
		//console.log(matrix[4]);

		const embedding = umap.fit(this.featureMatrix);

		console.log(embedding[0]);
		console.log(embedding.length);



	}

	//fills coexhibition list with artists and their co-exhibition vectors
	/* computeAdjacencylist() {
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
	} */

	//one hot vector for gender
	/* computeGenderVectors() {
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

	} */

	//one-hot vector for artist nationalities
	/* computeCountryVector() {

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


	} */

	/* loadExhibitions() {
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
	} */


	normalizeZscore(value: number, mean: number, stddev: number): number {
		let normalized = 0;

		normalized = (value - mean) / stddev;

		return normalized;
	}

	mapToJson = (map: any) => {
		return JSON.stringify(Object.fromEntries(map));
	};


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
	//<div className="row-span-1 col-span-2 z-40">
	//<div className="w-full h-[10vh]" id="artistinfo-container">
	//							<div className="float-left text-left pl-2"></div>

	render() {
		return (
			<>
				<div className="absolute -z-10">
					<svg id='artist-clustering' width={this.state.width} height={this.state.height}></svg>
				</div>

			</>
		);
	}


};

export default ClusteringComponent;