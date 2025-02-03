import { Artist } from "./artist.model";
import { Exhibition } from "./exhibition.model";

export type Item = {
    id: number;
    title: String;
    title_alternate: String;
    type: number;
    description: String;
    displaycreator: String;
    style: number;
    measurements: String;
    technique: String;
    wasExhibitedAtExhibitions: Array<Exhibition>;
    artistsCreated: Array<Artist>;
};