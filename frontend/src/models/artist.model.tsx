
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
	birthyear: number;
	birthplace?: string;
	collective: string;
	country?: string;
	deathdate?: Date;
	deathyear: number;
	deathplace?: string;
	sex?: string;
	title?: string;
	name_variant: string;
	occupation: string;
	pnd: string;
	ulan: string;
	profession: string;
	sortname: string;
	study: string;
    coExhibitedArtists: Array<Artist>;
	coExhibitedTotalArtists: Array<Artist>;
	createdItems?: Array<Item>;
	exhibitedAtExhibitions?: Array<Exhibition>;
};