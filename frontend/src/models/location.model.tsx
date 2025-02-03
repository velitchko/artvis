import { Exhibition } from "./exhibition.model";
import { Geoname } from "./geoname.model";

export type Location = {
    country: String;
    dissolutiondate: String;
    dissolutionyear: number;
    exhibitionsTookPlaceAt: Array<Exhibition>;
    flags: number;
    foundingdate: number;
    gnd: String;
    id: number;
    locatedAtGeonames: Array<Geoname>;
    name: String;
    place: String;
    place_tgn: number;
    status: number;
    type: String;
    ulan: String;
};