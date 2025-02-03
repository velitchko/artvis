import { Exhibition } from "./exhibition.model";

export type Venue = {
	id: number;
	name: String;
	place: String;
	place_tgn: String;
	type: String;
	heldExhibitions: Array<Exhibition>;
};