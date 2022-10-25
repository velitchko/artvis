import { Neo4jGraphQL } from "@neo4j/graphql";
import { ApolloServer, gql } from "apollo-server";
import neo4j from "neo4j-driver";

const typeDefs = gql`
type Artist {
	artistsExhibitedWith: [Artist!]! @relationship(type: "EXHIBITED_WITH", direction: IN, properties: "ExhibitedWithProperties")
	birthdate: String!
	birthplace: String!
	country: String!
	createdCatalogueEntries: [CatalogueEntry!]! @relationship(type: "CREATED", direction: OUT)
	createdItemItems: [Item!]! @relationship(type: "CREATED_ITEM", direction: OUT)
	deathdate: String!
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
	exhibitions: [String]!
}

type Exhibition {
	artistsExhibited: [Artist!]! @relationship(type: "EXHIBITED", direction: IN, properties: "ExhibitedProperties")
	catalogueEntriesEntryIn: [CatalogueEntry!]! @relationship(type: "ENTRY_IN", direction: IN)
	cataloguesIsCatalogueFor: [Catalogue!]! @relationship(type: "IS_CATALOGUE_FOR", direction: IN)
	enddate: String
	id: String!
	organizer: String
	startdate: String
	title: String
	tookPlaceInLocations: [Location!]! @relationship(type: "TOOK_PLACE_IN", direction: OUT)
	type: String
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
}

type Location {
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
`;

const driver = neo4j.driver(
    "neo4j://localhost:7687",
    neo4j.auth.basic("neo4j", "root")
);

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

neoSchema.getSchema().then((schema) => {
    const server = new ApolloServer({
        schema,
    });

    server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`);
    });
})