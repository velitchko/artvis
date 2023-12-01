import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import GET_EXHIBITION from '../../queries/exhibition';
import TableComponent from '../table/table';
import SearchComponent from '../search/search';
import GET_ARTIST_BY_NAME from '../../queries/artistByName';
import client from '../apollo/client';
import GET_ARTIST from '../../queries/artist';


class ExhibitionsComponent extends React.Component<{ artist: Artist }, { artist: Artist }> {

	constructor(props: { artist: Artist }) {
		super(props);

		this.state = {
			artist: props.artist
		};
	}

	onClick = (event: any) => {
		this.onArtistChange(event);
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


	getUniqueExhibitions(exhibitions?: Array<Exhibition>): number {
		if (!exhibitions) return 0;

		const uniqueExhibitions = Array.from(new Set(exhibitions));

		return uniqueExhibitions.length;
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
							<div className="w-full h-[90vh] sm:h-full" id="circular-timeline-container">

							</div>
						</div>

						<div className="lg:row-span-3 md:row-span-1 col-span-2 z-30">
							<div className="w-full h-full overflow-y-scroll" id="table-container">
								<TableComponent query={GET_EXHIBITION} baseId={this.state.artist.id} compareWith={null} exhibitions={this.state.artist.exhibitedExhibitions} />
							</div>
						</div>
					</div>
				}
			</>
		);
	}
};

export default ExhibitionsComponent;