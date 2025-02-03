
import { Exhibition } from './exhibition.model';
import { Item } from './item.model';

export type Artist = {
    // FROM THE SCHEMA
	id: number;
	firstname: String;
	lastname: String;
	birthdate?: Date;
	birthyear: number;
	birthplace?: String;
	birthplace_tgn: String;
	collective: String;
	country?: String;
	deathdate?: Date;
	deathyear: number;
	deathplace?: String;
	deathplace_tgn: String;
	sex?: String;
	title?: String;
	name_variant: String;
	occupation: String;
	pnd: String;
	ulan: String;
	profession: String;
	sortname: String;
	study: String;
    artistsCoExhibited: Array<Artist>; // IN Direction
	artistsCoExhibitedTotal: Array<Artist>; // IN Direction
	coExhibitedArtists?: Array<Artist>; // OUT Direction
	coExhibitedTotalArtists?: Array<Artist>; // OUT Direction
	createdItems?: Array<Item>;
	exhibitedAtExhibitions?: Array<Exhibition>;
};