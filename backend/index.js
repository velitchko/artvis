import { Neo4jGraphQL } from '@neo4j/graphql';
import { ApolloServer } from '@apollo/server';
import gql from 'graphql-tag';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import neo4j from 'neo4j-driver';

import { schema } from './schema.js';
import { cypherRouter } from './cypherRouting.js';
import compression from 'compression';

const typeDefs = gql`${schema}`;

// TODO: Load from secrets
const driver = neo4j.driver(
	'bolt://localhost:7687',
	neo4j.auth.basic('neo4j', 'admin123')
);
const app = express();

// Configure CORS with specific options
const corsOptions = {
	origin: ['http://localhost:4200', 'http://localhost:3000', 'https://artvis.cvast.tuwien.ac.at'],
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'token'],
};

app.use(compression());
app.use(cors(corsOptions));

const httpServer = http.createServer(app);

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

neoSchema.getSchema().then(async (schema) => {
	const server = new ApolloServer({
		schema,
		plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
	});

	await server.start();

	app.set('neo4jDriver', driver);

	app.use(
		'/graphql',
		bodyParser.json(),
		// expressMiddleware accepts the same arguments:
		// an Apollo Server instance and optional configuration options
		expressMiddleware(server, {
			context: async ({ req }) => ({
				token: req.headers.token
			}),
		}),
	);

	app.use('/cypher', bodyParser.json(), cypherRouter);

	// Setup /api endpoint to serve GraphQL with proper CORS
	app.use('/api', bodyParser.json(), expressMiddleware(server, {
		context: async ({ req }) => ({
			token: req.headers.token
		}),
	}));


	// Modified server startup
	await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));

	console.log(`🚀 Server ready at http://localhost:4000/`);
	// app.use('/graphql', cors(), json(), expressMiddleware(server));


	// server.listen(4000).then(({ url }) => {
	// 	console.log(`🚀 Server ready at ${url}`);
	// });
});

