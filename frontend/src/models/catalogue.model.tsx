import { Artist } from "./artist.model";
import { Exhibition } from "./exhibition.model";

export type Catalogue = {
	id: String;
	author: String;
	editor: String;
	place?: String;
	publicationDate?: String;
	publisherId?: String;
	subtitle?: String;
	title?: String;
	type?: String;
    artistsWasFeaturedIn?: Array<Artist>;
	isCatalogueForExhibitions?: Array<Exhibition>;
};