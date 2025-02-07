import { Exhibition } from "./exhibition.model";

export type Host = {
	id: number;
	country: string;
	name: string;
	latitude: number;
	longitude: number;
	place: string;
	place_tgn: number;
	type: string;
	exhibitionsTookPlaceIn: Exhibition[];
}