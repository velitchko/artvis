import { Artist } from './artist.model';

export type Group = {
	id: string;
	name: string;
	artistsMemberOf: Array<Artist>;
};
