import { Location } from './location.model';

export type Geoname = {
	id: number;
	country_code?: string;
	name: string;
	name_alternate?: string;
	parent_path: string;
	status: number;
	tgn: number;
	latitude: number;
	longitude: number;
	tgn_parent?: number;
	type: string;
	locationsLocatedAt: Array<Location>;
};