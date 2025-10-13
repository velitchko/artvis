import { Exhibition } from "./exhibition.model";

export type Venue = {
	id: number;
	name: string;
	place: string;
	place_tgn: number;
	type?: string;
	status: number;
	flags: number;
	heldExhibitions: Array<Exhibition>;
};