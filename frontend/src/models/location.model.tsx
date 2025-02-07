import { Exhibition } from "./exhibition.model";
import { Geoname } from "./geoname.model";

export type Location = {
    country: string;
    dissolutiondate: string;
    dissolutionyear: number;
    exhibitionsTookPlaceAt: Array<Exhibition>;
    flags: number;
    foundingdate: number;
    gnd: string;
    id: number;
    locatedAtGeonames: Array<Geoname>;
    name: string;
    place: string;
    place_tgn: number;
    status: number;
    type: string;
    ulan: string;
};