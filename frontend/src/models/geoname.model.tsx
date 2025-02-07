import { Location } from './location.model';

export type Geoname = {
    country_code: string;
	id: number;
	locationsLocatedAt: Array<Location>;
	name: string;
	name_alternate: string
	parent_path: string;
	status: number;
	latitude: number;
	longitude: number;
	tgn: number;
	tgn_parent: number;
	type: string;
};