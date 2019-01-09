const client = require('./redis').client;

class Publisher {
    constructor(channel) {
        this.channel = channel;
    }

    publish(event, data = {}) {
        client.publish(this.channel, JSON.stringify({event, data}));
    }
}

module.exports = Publisher;