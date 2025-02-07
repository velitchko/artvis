import { Exhibition } from './exhibition.model';

export type Organizer = {
	dissolutiondate: string;
	dissolutionyear: number;
	foundingdate: number;
	gnd: string;
	id: number;
	name: string;
	organizedExhibitions: Array<Exhibition>;
	place: string;
	place_tgn: number;
	status: number;
	type: string;
};
