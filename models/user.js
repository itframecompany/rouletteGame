const url = require('url');
const qs = require('querystring');

const config = require('../config');
const db = require('../libs/db');

class User {
    constructor({id, steam_id, name, avatar, steam_level, tradelink, eula = 0}) {
        if (id) this.id = id;
        
        this.steamId = steam_id;
        this.name = name;
        this.avatar = avatar;
        this.steamLevel = steam_level;
        this.eula = eula;

        if (tradelink) this.setTradelink(tradelink);

        this.console = {};
        ['log', 'error', 'warn', 'info'].forEach(method => {
            this.console[method] = console[method].bind(console, `[User ${this.steamId}]`);
        });
    }
    
    setTradelink(link) {
        this.tradelink = link;

        const query = url.parse(this.tradelink).query;

        this.token = qs.parse(query).token;
    }
    
    save() {
        this.console.log('Saving data...');

        return new Promise((resolve, reject) => {
            db.query(
                `insert into ${config.tables.user} set ?
                on duplicate key update name = values(name), avatar = values(avatar)`,
                {
                    steam_id: this.steamId,
                    name: this.name,
                    avatar: this.avatar,
                    steam_level: this.steamLevel
                }, 
                (err, result) => {
                    if (err) return reject(err);
                    
                    if (result.insertId) this.id = result.insertId;

                    this.console.log(`Data successfully saved with id ${this.id}`);
    
                    resolve(this);
                }
            );
        });
    }

    static findById(id) {
        return new Promise((resolve, reject) => {
            db.query(`select * from ${config.tables.user} where id = ?`, id, (err, rows) => {
                if (err) return reject(err);

                if (!rows.length) return resolve(null);

                resolve(new this(rows.shift()));
            });
        });
    }

    static findBySteamId(steamId) {
        return new Promise((resolve, reject) => {
            db.query(`select * from ${config.tables.user} where steam_id = ?`, steamId, (err, rows) => {
                if (err) return reject(err);

                if (!rows.length) return resolve(null);

                resolve(new this(rows.shift()));
            });
        });
    }
    
    updateTradelink(tradelink) {
        this.console.log('Updating tradelink...');

        return new Promise((resolve, reject) => {
            db.query(`update ${config.tables.user} set tradelink = ? where id = ?`, [tradelink, this.id], err => {
                if (err) return reject(err);
                
                this.setTradelink(tradelink);
                
                this.console.log('Tradelink successfully updated');
                
                resolve();
            });
        });
    }
}

module.exports = User;