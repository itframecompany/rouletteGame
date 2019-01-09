const Cache = require('./');

class SecretCache extends Cache {
    constructor(userId, secret) {
        super(`${userId}:${secret}`);
    }
    
    get prefix() {
        return 'secret';
    }

    get ttl() {
        return 30 * 60;
    }
}

module.exports = SecretCache;
