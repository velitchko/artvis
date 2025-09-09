import { Exhibition } from "./exhibition.model";

// Note: Host type is not currently in the backend schema
// Keeping this for potential future use
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