const _ = require('lodash');
const Queue = require('bull');

const config = require('../../config');

const SocketError = require('../../models/error/socket');
const Socket = require('./');
const Inventory = require('../../models/inventory');
const InventoryCache = require('../../models/cache/inventory');
const Deposit = require('../../models/deposit');
const DepositItem = require('../../models/item/deposit');
const stats = require('../../models/stats');
const user = require('../../models/user');

const betQueue = Queue('bet');
const depositQueue = Queue('deposit');
const withdrawQueue = Queue('withdraw');

class AuthorizedSocket extends Socket {
    constructor(socket) {
        super(socket);

        this.send('user', this.user);

        this.sendDeposit();
        this.userStats(this.user.id);
    }

    get isAuthorized() {
        return true;
    }

    setIdentity() {
        this.user = this.socket.upgradeReq.user;
        this.id = this.user.id;
    }

    sendDeposit() {
        Deposit.getByUserId(this.user.id).then(deposit => {
            this.send('user.update', {deposit});
        }).catch(console.error);
    }

    subscribe() {
        super.subscribe();

        this.subscriber.register('bet.new', () => {
            this.sendDeposit();
            this.send('round.bet.success');
        });

        this.subscriber.register('win', () => this.sendDeposit());

        this.subscriber.register('trade.new', data => {
            this.sendDeposit();
            this.send('trade.info', data);
        });

        this.subscriber.register('trade.withdraw', () => this.sendDeposit());

        this.subscriber.register('trade.state', data => this.send('trade.state', data));

        this.subscriber.register('trade.done', () => this.sendDeposit());

        this.subscriber.register('trade.cancel', () => this.sendDeposit());

        this.subscriber.register('trade.fail', itemIds => {
            Deposit.setStatus(itemIds, this.user.id, DepositItem.status.ACTIVE).then(() => this.sendDeposit());
        });

        this.subscriber.register('error', error => this.sendError(error));
    }

    addJob(queue, data = {}, timeout) {
        Object.assign(data, {
            user: this.user
        });

        super.addJob(queue, data, timeout);
    }

    listen() {
        super.listen();

        this.on('bet', data => {
            this.addJob(betQueue, {
                room: data.room,
                itemIds: data.items
            });
        });

        this.on('tradelink', data => {
            this.user.updateTradelink(data.tradelink).then(() => {
                this.send('tradelink.success');
            }).catch(() => {
                this.sendError(SocketError.TRADELINK_FAIL());
            });
        });

        this.on('inventory', () => {
            const cache = new InventoryCache(this.user.steamId);

            Inventory.getBySteamId(this.user.steamId).then(inventory => {
                let items = [...inventory.values()];

                cache.put(items);

                items = items.map(item => {
                    item.isAvailable = item.tradable && item.hasValidName() && item.hasValidPrice();
                    return item;
                }).sort((a,b) => {return b.price - a.price});
                
                this.send('user.inventory', _.sortBy(items, {isAvailable: false}));
            }).catch(() => {
                this.sendError(SocketError.INVENTORY());
            });
        });

        this.on('deposit', () => {
            Deposit.getByUserId(this.user.id).then(deposit => {
                const items = [...deposit.values()].filter(item => item.isActive).sort((a,b) => {return b.price - a.price});
                this.send('user.deposit', items);
            }).catch(() => {
                this.sendError(SocketError.INTERNAL());
            });
        });

        this.on('deposit.add', data => {
            if (!Array.isArray(data.assets)) {
                this.sendError(SocketError.INTERNAL());
                return;
            }
            
            Deposit.getCountByUserId(this.user.id).then(count => {
                if (data.assets.length + count > config.MAX_DEPOSIT_ITEMS) {
                    this.sendError(SocketError.MAX_DEPOSIT_ITEMS());
                    return;
                }

                this.console.log('Adding deposit job...');
                
                this.addJob(depositQueue, {
                    assetIds: data.assets
                });
            }).catch(() => {
                this.sendError(SocketError.INTERNAL());
            });
        });

        this.on('deposit.withdraw', data => {
            if (!Array.isArray(data.items)) {
                this.sendError(SocketError.INTERNAL());
                return;
            }

            this.console.log('Adding withdraw job...');

            this.addJob(withdrawQueue, {
                itemIds: data.items
            });
        });

        this.on('user.stats', () => this.userStats(this.user.id));
    }

    userStats(id) {
        stats.fetchPlayer(id).then((result) => {
            this.send('user.stats', result);
        });
    }
}

module.exports = AuthorizedSocket;
