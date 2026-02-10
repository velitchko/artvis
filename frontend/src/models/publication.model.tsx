export type Publication = {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  year: number;
  type: string;
  doi?: string;
  url?: string;
  bibtex: string;
  group?: 'core' | 'related';
};
