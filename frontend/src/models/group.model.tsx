import { Artist } from './artist.model';

export type Group = {
	id: number;
	name: string;
	artistsMemberOf: Array<Artist>;
};
