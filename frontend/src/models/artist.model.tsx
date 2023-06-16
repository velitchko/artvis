
import { Exhibition } from './exhibition.model';
import { Catalogue } from './catalogue.model';
import { CatalogueEntry } from './catalogueEntry.model';
import { Item } from './item.model';

export type Artist = {
    // FROM THE SCHEMA
	id: String;
	firstname: String;
	lastname: String;
	birthdate?: Date;
	birthplace?: String;
	country?: String;
	deathdate?: Date;
	deathplace?: String;
	sex?: String;
	title?: String;
    artistsExhibitedWith: Array<Artist>;
	wasFeaturedInCatalogues?: Array<Catalogue>;
	createdCatalogueEntries?: Array<CatalogueEntry>;
	createdItemItems?: Array<Item>;
	exhibitedExhibitions?: Array<Exhibition>;
    exhibitedWithArtists?: Array<Artist>;
};