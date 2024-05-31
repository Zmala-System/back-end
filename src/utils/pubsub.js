const { RedisPubSub } = require("graphql-redis-subscriptions");

const pubsub = new RedisPubSub({
  connection: {
    password: "JXagbpiG6Kj0Opmdc1hIPuY886vUMeCl",
    host: "redis-16389.c56.east-us.azure.cloud.redislabs.com",
    port: 16389,
    // password: 'pass*',
    retryStrategy: (times) => {
      return Math.min(times * 50, 2000);
    },
  },
});

module.exports = { pubsub };
