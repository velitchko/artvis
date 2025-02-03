import { Artist } from "./artist.model";
import { Item } from "./item.model";
import { Organizer } from "./organizer.model";
import { Venue } from "./venue.model";

export type Exhibition = {
	id: number;
	startdate: Date;
	startyear: number;
	enddate: Date;
	endyear: number;
	displaydate: String,
	organizer: String;
	organizer_type: String;
	organizing_committee: String;
	price: String;
	status: number;
	title: String;
	title_short: String;
	title_alternate: String;
	type: String;
	tookPlaceAtLocations: Array<Location>;
	venuesHeldAt: Array<Venue>;
	artistsExhibitedAt: Array<Artist>;
	organizersOrganizedBy: Array<Organizer>;
	itemsWasExhibitedAt: Array<Item>;
};