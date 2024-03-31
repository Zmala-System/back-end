const express = require("express");
const mongoose = require("mongoose");
const { ApolloServer, AuthenticationError } = require("apollo-server-express");
const typeDefs = require("./src/models/graphql/typeDef.js");
const resolvers = require("./src/models/graphql/resolvers.js");
const isAuth = require("./src/middleware/is-auth.js");
const sendAlert= requre("./src/middleware/sendAlert.js");
const geolib = require('geolib');
const { startStandaloneServer } = require("@apollo/server/standalone");
const bodyParser = require('body-parser');
const dbURI = 'mongodb+srv://Safouane:Safouane2004@projet2cp.so6lhs3.mongodb.net/?retryWrites=true&w=majority&appName=Projet2CP'
const mqtt = require('mqtt');
mongoose.connect(dbURI, { useNewUrlParser: true })
.then((result) => console.log('connected to the db'))
.catch((err) => console.log(err));

async function startApolloServer() {
  const server = new ApolloServer({ 
    typeDefs, 
    resolvers,
    context: ({ req }) => ({ req }),
  });

  await server.start();

  const app = express();

  const mqttClient = mqtt.connect('mqtt://d4ab5fc285704532b79b0ef3e1067042.s1.eu.hivemq.cloud:8883'); // Assuming MQTT broker is running on mqhive

  mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      mqttClient.subscribe('prisoner-location'); // Subscribe to the topic where prisoner locations are published
  });

  mqttClient.on('message', async (topic, message) => {
    console.log('Received message on topic:', topic, 'with message:', message.toString());
    const { prisonerId, location } = JSON.parse(message.toString());

    try {
        const prisoner = await Prisoner.find({deviceId:prisonerId}).exec();
        if (!prisoner) {
            throw new Error(`Prisoner with ID '${prisonerId}' not found.`);
        }

        // Update the prisoner's location in the database
        prisoner.currentLocations.push(location);
        await prisoner.save();
        console.log(`Added new location for prisoner '${prisonerId}': ${location}`);
    } catch (error) {
        console.error('Error updating prisoner location:', error.message);
    }
});

  mqttClient.on('error', (err) => {
      console.error('Error connecting to MQTT broker:', err);
  });

  app.use(isAuth);
  app.use(sendAlert);

  server.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log(`Server ready at http://localhost:4000${server.graphqlPath}`);
  });
}

startApolloServer();
module.exports = { mqttClient };
