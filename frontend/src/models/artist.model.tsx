
import { Exhibition } from './exhibition.model';
import { Catalogue } from './catalogue.model';
import { CatalogueEntry } from './catalogueEntry.model';
import { Item } from './item.model';

export type Artist = {
    // FROM THE SCHEMA
	id: string;
	firstname: string;
	lastname: string;
	birthdate?: Date;
	birthplace?: string;
	country?: string;
	deathdate?: Date;
	deathplace?: string;
	sex?: string;
	title?: string;
    artistsExhibitedWith: Array<Artist>;
	wasFeaturedInCatalogues?: Array<Catalogue>;
	createdCatalogueEntries?: Array<CatalogueEntry>;
	createdItemItems?: Array<Item>;
	exhibitedExhibitions?: Array<Exhibition>;
    exhibitedWithArtists?: Array<Artist>;
};