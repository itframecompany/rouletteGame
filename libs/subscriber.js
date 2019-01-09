const EventEmitter = require('events');

const redis = require('./redis');

class Subscriber extends EventEmitter {
    constructor(channel) {
        super();
        
        this.handlers = {};
        
        this.client = redis.createClient();

        this.client.on('message', (channel, message) => {
            message = JSON.parse(message);

            if (!this.handlers[message.event]) return;

            this.handlers[message.event].forEach(handler => handler(message.data));
        });
        
        this.client.subscribe(channel, () => this.emit('ready'));
    }
    
    register(event, handler) {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        
        this.handlers[event].push(handler);
    }
    
    close() {
        this.client.quit();
    }
}

module.exports = Subscriber;