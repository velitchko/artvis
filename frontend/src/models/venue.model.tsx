import { Exhibition } from "./exhibition.model";

export type Venue = {
	id: number;
	name: string;
	place: string;
	place_tgn: string;
	type: string;
	heldExhibitions: Array<Exhibition>;
};