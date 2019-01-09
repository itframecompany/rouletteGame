const _ = require('lodash');

const config = require('../../config');
const db = require('../../libs/db');

class Bet {
    constructor(player, items, ticketsFrom) {
        this.player = player;
        this.items = items;
        this.ticketsFrom = ticketsFrom;
        this.ticketsTo = this.ticketsFrom - 1;
    }

    isWinning(ticket) {
        return _.inRange(ticket, this.ticketsFrom, this.ticketsTo + 1);
    }

    toJSON() {
        return {
            player: this.player.id,
            tickets: [this.ticketsFrom, this.ticketsTo],
            items: [...this.items.values()]
        };
    }

    place(roundId, ticketSum) {
        this.ticketsTo += ticketSum;
        
        return new Promise((resolve, reject) => {
            db.query(`insert into ${config.tables.bet} set ?`, {
                round_id: roundId,
                user_id: this.player.id,
                tickets_from: this.ticketsFrom,
                tickets_to: this.ticketsTo
            }, (err, result) => {
                if (err) return reject(err);

                this.id = result.insertId;

                const values = [...this.items.keys()].map(depositId => [this.id, depositId]);

                db.query(`insert into ${config.tables.betDeposit} (bet_id, deposit_id) values ?`, [values], err => {
                    if (err) return reject(err);

                    resolve();
                });
            });
        });
    }
}

module.exports = Bet;