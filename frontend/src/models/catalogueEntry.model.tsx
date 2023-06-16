import { Artist } from "./artist.model";
import { Exhibition } from "./exhibition.model";
import { Item } from "./item.model";

export type CatalogueEntry = {
	id: String;
	title: String;
	type: String;
    catalogueId: String;
	displayCreator: String
	displayDate: String
	idExhibition: String;
	idItem: String;
	style: String;
	idPerson: String;
	technique: String;
    artistsCreated: Array<Artist>;
	entryInExhibitions: Array<Exhibition>;
    itemsVerifiedInCatalogueEntry: Array<Item>;
};