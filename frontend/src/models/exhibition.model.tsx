import { Artist } from "./artist.model";
import { Item } from "./item.model";
import { Organizer } from "./organizer.model";
import { Venue } from "./venue.model";
import { Location } from "./location.model";

export type Exhibition = {
	id: number;
	startdate: string;
	startyear: number;
	enddate?: string;
	endyear?: number;
	displaydate?: string;
	organizer?: string;
	organizer_type?: string;
	organizing_committee?: string;
	price?: string;
	status: number;
	title: string;
	title_short?: string;
	title_alternate?: string;
	type: string;
	tookPlaceAtLocations: Array<Location>;
	venuesHeld: Array<Venue>;
	artistsExhibitedAt: Array<Artist>;
	organizersOrganized: Array<Organizer>;
	exhibitsItems: Array<Item>;
};