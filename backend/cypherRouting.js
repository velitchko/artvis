import express from 'express';

const cypherRouter = express.Router()


// middleware that is specific to this router
cypherRouter.use((req, res, next) => {
    console.log('Time: ', new Date(Date.now()))
    next()
})
// cypher post query route
cypherRouter.post('/cypher', (req, res) => {
    req.app.get('neo4jDriver')
        .session()
        .run(req.body.cypher)
        .then((result) => {
            res.json(result.records.map((record) => record.toObject()));
        }).catch((error) => {
            console.error(error);
            res.status(500).json({ error: error.message });
        });
})
// cypher centrality query route
cypherRouter.post('/centrality', (req, res) => {
    res.send('got centrality query');
})

export { cypherRouter };
