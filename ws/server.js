const passport = require('passport');
const session = require('../middlewares/session');

const config = require('../config');

const WebSocketServer = require('ws').Server;
const Socket = require('./socket');
const AuthorizedSocket = require('./socket/authorized');

const Subscriber = require('../libs/subscriber');

class SocketServer extends WebSocketServer {
    constructor(server) {
        super({
            path: '/ws',
            clientTracking: false,
            server
        });

        console.info(`WebSocket server started`);

        this.connections = new Set();

        this.on('connection', socket => {
            console.info('Connection established');

            this.authorize(socket.upgradeReq).then(user => {
                const upgradedSocket = user ? new AuthorizedSocket(socket) : new Socket(socket);

                this.connections.add(upgradedSocket);

                socket.on('close', (code, message) => {
                    console.info('Connection closed', code, message);
                    this.connections.delete(upgradedSocket);
                });
            }).catch(console.error);
        });
        
        const subscriber = new Subscriber(config.CHANNEL_ROUND);

        subscriber.register('bet', data => this.broadcast('round.bet', data));
        subscriber.register('state', data => this.broadcast(`round.state.${data.state}`, data));
        subscriber.register('history', data => this.broadcast('room.history', data));
        subscriber.register('stats', data => this.broadcast('stats', data ));

        const notifySubscriber = new Subscriber(config.CHANNEL_NOTIFY);

        notifySubscriber.register('price.update', () => {
            this.connections.forEach(client => {
                if (!client.isAuthorized) return;
                client.sendDeposit();
            });
        });
    }

    broadcast(type, data) {
        this.connections.forEach(client => client.send(type, data));
    }

    authorize(req) {
        return new Promise(resolve => {
            session(req, {}, () => {
                passport.initialize()(req, {}, () => {
                    passport.session()(req, {}, () => {
                        resolve(req.user);
                    });
                });
            });
        });
    }
}

module.exports = server => new SocketServer(server);