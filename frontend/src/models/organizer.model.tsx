import { Exhibition } from './exhibition.model';

export type Organizer = {
	dissolutiondate: String;
	dissolutionyear: number;
	foundingdate: number;
	gnd: String;
	id: number;
	name: String;
	organizedExhibitions: Array<Exhibition>;
	place: String;
	place_tgn: number;
	status: number;
	type: String;
};
