import { Neo4jGraphQL } from "@neo4j/graphql";
import { ApolloServer, gql } from "apollo-server";
import neo4j from "neo4j-driver";

import { schema } from './schema.js';

const typeDefs = gql`${schema}`;

const driver = neo4j.driver(
	"neo4j://localhost:7687",
	neo4j.auth.basic("neo4j", "root")
);

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

neoSchema.getSchema().then((schema) => {
	const server = new ApolloServer({
		schema,
	});

	server.listen(4000).then(({ url }) => {
		console.log(`🚀 Server ready at ${url}`);
	});
});

