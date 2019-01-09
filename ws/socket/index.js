const Queue = require('bull');
const uuid = require('node-uuid');

const Round = require('../../game/models/round');
const stats = require('../../models/stats');
const gibs = require('../../models/gibs');

const config = require('../../config');

const SocketError = require('../../models/error/socket');
const Subscriber = require('../../libs/subscriber');

const infoQueue = Queue('info');

class Socket {
    constructor(socket) {
        this.socket = socket;

        this.subscribe();

        this.socket.on('error', console.error);

        this.sendGibs();
        this.sendStats();

        this.listen();

        this.console = {};
        ['log', 'error'].forEach(method => {
            this.console[method] = console[method].bind(console, `[Socket ${this.id}]`);
        });
    }

    get isAuthorized() {
        return false;
    }

    setIdentity() {
        this.id = uuid.v4();
    }

    send(type, data = {}) {
        this.socket.send(JSON.stringify({
            type,
            messageData: data,
            timestamp: Math.floor(Date.now() / 1000)
        }));
    }

    addJob(queue, data = {}, timeout = 5 * 1000) {
        Object.assign(data, {
            id: this.id
        });

        queue.add(data, {timeout});
    }

    subscribe() {
        this.setIdentity();

        this.subscriber = new Subscriber(`${config.CHANNEL_SOCKET_PREFIX}.${this.id}`);

        this.subscriber.register('game.info', game => {
            Promise.all(Object.keys(game).map(key => {
                const room = game[key];
                return Round.getHistoryByRoomId(room.id).then(history => room.history = history);
            })).then(() => {
                this.send('rooms.update', game);
            }).catch(console.error);
        });

        this.subscriber.on('ready', () => {
            // @todo Subscribe to round.bet event and gather bets, then concat with data from Game process
            this.addJob(infoQueue);
        });

        this.socket.on('close', () => this.subscriber.close());
    }

    sendGibs() {
        gibs.getWidget().then(widget => {
            this.send('giveaway', widget);
        });
    }

    sendStats() {
        stats.record().then((data) => {
            this.send('stats', data);
        }).catch(error => console.error(error));
    }
    
    listen() {
        this.handlers = {};

        this.on('stats', () => this.sendStats());

        this.socket.on('message', data => {
            try {
                data = JSON.parse(data);
            } catch (error) {
                return this.sendError(SocketError.BAD_JSON());
            }

            if (!this.handlers[data.type]) {
                return this.sendError(SocketError.WRONG_EVENT_TYPE());
            }

            this.handlers[data.type](data);
        });
    }

    on(type, handler) {
        this.handlers[type] = handler;
    }

    sendError(error) {
        this.send('error', error);
    }
}

module.exports = Socket;
