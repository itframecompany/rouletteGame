const client = require('../../libs/redis').client;

class Cache {
    constructor(key) {
        this.key = `${this.prefix}:${key}`;
    }
    
    get prefix() {
        return 'cache';
    }
    
    get ttl() {
        return 0;
    }
    
    get() {
        return new Promise((resolve, reject) => {
            client.get(this.key, (error, reply) => {
                if (error) return reject(error);
                resolve(JSON.parse(reply));
            });
        });
    }
    
    put(data, ttl = this.ttl) {
        client.setex(this.key, ttl, JSON.stringify(data));
    }

    remove() {
        client.del(this.key);
    }
}

module.exports = Cache;
