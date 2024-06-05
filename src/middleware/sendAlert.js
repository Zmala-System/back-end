function mqttAlertMiddleware(mqttClient) {
  return (req, res, next) => {
    req.sendAlert = (prisonerId, message) => {
      const topic = `prisoner-alert/${prisonerId}`;
      mqttClient.publish(topic, message);
      console.log(`Sent alert for prisoner '${prisonerId}': ${message}`);
    };
    next();
  };
}

module.exports = mqttAlertMiddleware;
