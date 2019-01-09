const redis = require('redis');

const client = createClient();

exports.client = client;

exports.createClient = createClient;

function createClient() {
    return redis.createClient(process.env.REDIS_URL);
}