import { Exhibition } from "./exhibition.model";
import { Geoname } from "./geoname.model";

export type Location = {
	id: number;
	name: string;
	country?: string;
	dissolutiondate?: string;
	dissolutionyear?: number;
	foundingdate?: number;
	gnd?: string;
	place?: string;
	place_tgn?: number;
	status: number;
	type?: string;
	ulan?: string;
	flags: number;
	exhibitionsTookPlaceAt: Array<Exhibition>;
	locatedAtGeonames: Array<Geoname>;
};