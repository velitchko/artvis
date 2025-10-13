import { Exhibition } from './exhibition.model';

export type Organizer = {
	id: number;
	name: string;
	dissolutiondate?: string;
	dissolutionyear?: number;
	foundingdate?: number;
	gnd?: string;
	place?: string;
	place_tgn?: number;
	status: number;
	type: string;
	flags: number;
	organizedExhibitions: Array<Exhibition>;
};
