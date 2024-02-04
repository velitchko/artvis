import { Exhibition } from "./exhibition.model";

export type Host = {
	country: String;
	id: String;
	latitude: string;
	longitude: string;
	name: String;
	place: string;
	place_tgn: String;
	town: String;
	type: String;
	exhibitionsTookPlaceIn: Array<Exhibition>;
};