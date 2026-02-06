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
import dotenv from 'dotenv';
import { schema } from './schema.js';
import { cypherRouter } from './cypherRouting.js';
import compression from 'compression';


// Load .env.dev for dev, .env for start
const envFile = process.env.NODE_ENV === 'development' || process.argv.some(arg => arg.includes('nodemon'))
	? '.env.dev'
	: '.env';

dotenv.config({ path: envFile });
console.log(`Using environment file: ${envFile}`);

const typeDefs = gql`${schema}`;

const driver = neo4j.driver(
	process.env.NEO4J_URI,
	neo4j.auth.basic(
		process.env.NEO4J_USER,
		process.env.NEO4J_PASSWORD
	)
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

async function startServer() {
	try {
		const schema = await neoSchema.getSchema();
		const server = new ApolloServer({
			schema,
			plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
		});

		await server.start();

		app.set('neo4jDriver', driver);

		app.use(
			'/graphql',
			bodyParser.json(),
			expressMiddleware(server, {
				context: async ({ req }) => ({
					token: req.headers.token
				}),
			}),
		);

		app.use('/cypher', bodyParser.json(), cypherRouter);

		app.use('/api', bodyParser.json(), expressMiddleware(server, {
			context: async ({ req }) => ({
				token: req.headers.token
			}),
		}));

		await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
		console.log(`🚀 Server ready at http://localhost:4000/`);
	} catch (err) {
		console.error('Failed to start server:', err);
		process.exit(1);
	}
}

startServer();

