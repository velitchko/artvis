import { Artist } from "./artist.model";
import { Item } from "./item.model";
import { Organizer } from "./organizer.model";
import { Venue } from "./venue.model";
import { Location } from "./location.model";

export type Exhibition = {
	id: number;
	startdate: Date;
	startyear: number;
	enddate: Date;
	endyear: number;
	displaydate: string,
	organizer: string;
	organizer_type: string;
	organizing_committee: string;
	price: string;
	status: number;
	title: string;
	title_short: string;
	title_alternate: string;
	type: string;
	tookPlaceAtLocations: Array<Location>;
	venuesHeldAt: Array<Venue>;
	artistsExhibitedAt: Array<Artist>;
	organizersOrganizedBy: Array<Organizer>;
	itemsWasExhibitedAt: Array<Item>;
	itemsWasExhibitedAtAggregate: { count: number };
};