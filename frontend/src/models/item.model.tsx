import { Artist } from "./artist.model";
import { Exhibition } from "./exhibition.model";

export type Item = {
    id: number;
    title: string;
    title_alternate: string;
    type: number;
    description: string;
    displaycreator: string;
    style: number;
    measurements: string;
    technique: string;
    wasExhibitedAtExhibitions: Array<Exhibition>;
    artistsCreated: Array<Artist>;
};