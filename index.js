const express = require("express");
const { createServer } = require("http");
const mongoose = require("mongoose");
const { ApolloServer, AuthenticationError } = require("apollo-server-express");
const typeDefs = require("./src/models/graphql/typeDef.js");
const resolvers = require("./src/models/graphql/resolvers.js");
const isAuth = require("./src/middleware/is-auth.js");
const sendAlert = require("./src/middleware/sendAlert.js");
const geolib = require("geolib");
const bodyParser = require("body-parser");
//const dbURI = 'mongodb+srv://Safouane:Safouane2004@projet2cp.so6lhs3.mongodb.net/?retryWrites=true&w=majority&appName=Projet2CP'
const mqtt = require("mqtt");
const { Prisoner } = require("./src/models/Prisoners.js");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { execute, subscribe } = require("graphql");
const cors = require("cors");
const { pubsub } = require("./src/utils/pubsub.js");

const dotenv = require("dotenv");
dotenv.config();

const corsConfig = {
  credentials: true,
  allowedHeaders: ["Authorization"],
  exposedHeaders: ["Authorization"],
};
const path = "/zmala";

const { DB_URI, DB_NAME } = process.env;

const StartMQTT = () => {
  const mqttClient = mqtt.connect("mqtt://test.mosquitto.org:1883"); // TODO: Change Mqtt broker address
  mqttClient.on("connect", () => {
    console.log("Connected to MQTT broker");
    mqttClient.subscribe("zmalaPublish");
  });

  mqttClient.on("message", async (topic, message) => {
    console.log(
      "Received message on topic:",
      topic,
      "with message:",
      message.toString()
    );
    const data = JSON.parse(message);
    
    let prisonerId = data.deviceID

    let battery = data.battery;

    let alert1 = "None";
    let alert2 = "None";

    if (battery < 15) {
      alert1 = (`Battery is ${battery}`);
    }
  
    let location = { latitude: Number(data.latitude), longitude: Number(data.longitude) };

    try {
      const prisoner = await Prisoner.findOne({ deviceId: prisonerId}).exec();
      
      for (const polygon of prisoner.authorizedLocations) {
        if (!Array.isArray(polygon) || polygon.length < 3) {
          throw new Error(
            "Invalid polygon. Provide a polygon with at least 3 vertices."
          );
        }

        const formattedPolygon = polygon.map(({ latitude, longitude }) => ({
          latitude,
          longitude,
        }));
        const isInside = geolib.isPointInPolygon(
          location,
          formattedPolygon
        );

        if (!isInside) {
          alert2 = "Prisoner has left the authorized area";
        }
      }

      prisoner.battery = battery;
      
      if (alert1 != "None") {
        prisoner.alerts.push(alert1);
      }

      if (alert2 != "None") {
        prisoner.alerts.push(alert2);
      }

      if (prisoner.currentLocations.length >= 10) {
        prisoner.currentLocations = [location];
      } 

      else {
        prisoner.currentLocations.push(location);
      }

      await prisoner.save();

      if (!prisoner) {
        throw new Error(`Prisoner with ID '${prisonerId}' not found.`);
      }
      const channel = `locationChangedPrisoner_${prisonerId}`;
      const message = `${prisonerId}/${prisoner.name}/${location.latitude}/${location.longitude}/${battery}/${alert1}/${alert2}`;
      
      await pubsub.publish(channel, { message });
      
    } catch (error) {
      console.error("Error updating prisoner location:", error.message);
    }
  });

  mqttClient.on("error", (err) => {
    console.error("Error connecting to MQTT broker:", err);
  });
};

(async function () {
  StartMQTT();

  const app = express();
  const httpServer = createServer(app);
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // new lines for subserver setup
  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,

      onConnect: (connectionParams, webSocket, context) => {
        webSocket.on("close", () => {}); // this will excute when user dissconnect
      },
    },
    { server: httpServer, path: path }
  );

  const server = new ApolloServer({
    schema,
    plugins: [
      {
        async serverWillStart() {
          return {
            async frainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],

    context: ({ req, res }) => ({ req, res, pubsub }),
  });

  app.use(bodyParser.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(cors());
  app.use(isAuth);

  await server.start();

  server.applyMiddleware({ app, path, cors: corsConfig });
  mongoose.connect(DB_URI, { useNewUrlParser: true });

  const PORT = 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server ready at http://localhost:4000${server.graphqlPath}`);
  });
})();
