export interface LegalSection {
  id: string;
  title: string;
  body?: string[];
  list?: string[];
}

export interface LegalDoc {
  updated: string;
  sections: LegalSection[];
}
