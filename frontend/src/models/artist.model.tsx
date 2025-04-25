
import { Exhibition } from './exhibition.model';
import { Item } from './item.model';

export type Artist = {
	// FROM THE SCHEMA
	id: number;
	firstname: string;
	lastname: string;
	birthdate?: Date;
	birthyear: number;
	birthplace?: string;
	birthplace_tgn: string;
	collective: string;
	country?: string;
	deathdate?: Date;
	deathyear: number;
	deathplace?: string;
	deathplace_tgn: string;
	sex?: string;
	title?: string;
	name_variant: string;
	occupation: string;
	pnd: string;
	ulan: string;
	profession: string;
	sortname: string;
	study: string;
	artistsCoExhibited: Array<Artist>; // IN Direction
	artistsCoExhibitedTotal: Array<Artist>; // IN Direction
	coExhibitedArtists?: Array<Artist>; // OUT Direction
	coExhibitedTotalArtists?: Array<Artist>; // OUT Direction
	createdItems?: Array<Item>;
	exhibitedAtExhibitions?: Array<Exhibition>;
	numvenues: number;
	numcities: number;
	numcountries: number;
};