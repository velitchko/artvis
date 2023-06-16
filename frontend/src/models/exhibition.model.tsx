import { Artist } from "./artist.model";
import { Catalogue } from "./catalogue.model";
import { CatalogueEntry } from "./catalogueEntry.model";
import { Host } from "./host.model";

export type Exhibition = {
	id: String;
	startdate: number;
    enddate: number;
	organizer: String;
	title: String;
	type: String;
    catalogueEntriesEntryIn: Array<CatalogueEntry>
	tookPlaceInLocations: Array<Host>;
	cataloguesIsCatalogueFor: Array<Catalogue>;
    artistsExhibited: Array<Artist>;
};