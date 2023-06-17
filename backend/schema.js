export const schema = `type Artist {
	artistsExhibitedWith: [Artist!]! @relationship(type: "EXHIBITED_WITH", direction: IN, properties: "ExhibitedWithProperties")
	birthdate: Date!
	birthplace: String!
	country: String!
	createdCatalogueEntries: [CatalogueEntry!]! @relationship(type: "CREATED", direction: OUT)
	createdItemItems: [Item!]! @relationship(type: "CREATED_ITEM", direction: OUT)
	deathdate: Date!
	deathplace: String!
	exhibitedExhibitions: [Exhibition!]! @relationship(type: "EXHIBITED", direction: OUT, properties: "ExhibitedProperties")
	exhibitedWithArtists: [Artist!]! @relationship(type: "EXHIBITED_WITH", direction: OUT, properties: "ExhibitedWithProperties")
	firstname: String!
	id: String!
	lastname: String!
	sex: String!
	title: String!
	wasFeaturedInCatalogues: [Catalogue!]! @relationship(type: "WAS_FEATURED_IN", direction: OUT)
}

type Catalogue {
	artistsWasFeaturedIn: [Artist!]! @relationship(type: "WAS_FEATURED_IN", direction: IN)
	author: String!
	editor: String!
	id: String!
	isCatalogueForExhibitions: [Exhibition!]! @relationship(type: "IS_CATALOGUE_FOR", direction: OUT)
	place: String!
	publication_date: String!
	publisher_id: String!
	subtitle: String!
	title: String!
	type: String!
}

type CatalogueEntry {
	artistsCreated: [Artist!]! @relationship(type: "CREATED", direction: IN)
	catalogue_id: String!
	display_creator: String
	display_date: String
	entryInExhibitions: [Exhibition!]! @relationship(type: "ENTRY_IN", direction: OUT)
	id: String!
	id_exhibition: String!
	id_item: String!
	id_person: String!
	itemsVerifiedInCatalogueEntry: [Item!]! @relationship(type: "VERIFIED_IN_CATALOGUE_ENTRY", direction: IN)
	style: String
	technique: String
	title: String
	type: String!
}

interface ExhibitedProperties @relationshipProperties {
	id: String!
	title: String!
}

interface ExhibitedWithProperties @relationshipProperties {
	enddate: BigInt
	exhibitionId: String!
	startdate: BigInt!
	title: String!
}

type Exhibition {
	artistsExhibited: [Artist!]! @relationship(type: "EXHIBITED", direction: IN, properties: "ExhibitedProperties")
	catalogueEntriesEntryIn: [CatalogueEntry!]! @relationship(type: "ENTRY_IN", direction: IN)
	cataloguesIsCatalogueFor: [Catalogue!]! @relationship(type: "IS_CATALOGUE_FOR", direction: IN)
	enddate: BigInt
	id: String!
	organizer: String
	startdate: BigInt
	title: String
	tookPlaceInHosts: [Host!]! @relationship(type: "TOOK_PLACE_IN", direction: OUT)
	type: String
}

type Host {
	country: String!
	exhibitionsTookPlaceIn: [Exhibition!]! @relationship(type: "TOOK_PLACE_IN", direction: IN)
	id: String!
	latitude: String!
	longitude: String!
	name: String!
	place: String!
	place_tgn: String!
	town: String!
	type: String!
}

type Item {
	artistsCreatedItem: [Artist!]! @relationship(type: "CREATED_ITEM", direction: IN)
	catalogue_id: String
	creator_date: String
	display_date: String
	id: String!
	measurements: String
	technique: String
	title: String
	type: String
	verifiedInCatalogueEntryCatalogueEntries: [CatalogueEntry!]! @relationship(type: "VERIFIED_IN_CATALOGUE_ENTRY", direction: OUT)
}`;