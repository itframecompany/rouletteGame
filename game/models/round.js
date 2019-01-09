const _ = require('lodash');
const EventEmitter = require('events');

const config = require('../../config');
const db = require('../../libs/db');
const random = require('../../libs/random');

const Player = require('./player');
const Bet = require('./bet');
const Rake = require('./rake');
const Deposit = require('./../../models/deposit');
const DepositItem = require('./../../models/item/deposit');

class Round extends EventEmitter {
    constructor({id, number, winning_number, salt, hash, bank}, limits) {
        super();

        this.id = id;
        this.number = number;
        this.winningNumber = winning_number;
        this.salt = salt;
        this.hash = hash;
        this.bank = bank;

        this.players = new Map();
        this.pot = new Map();
        this.bets = [];

        this.limits = limits;
    }

    static create(roomId, limits) {
        return Promise.all([
            random.float(),
            random.salt()
        ]).then(([winningNumber, salt]) => {
            winningNumber = winningNumber.toFixed(17);

            const hash = random.hash(winningNumber, salt);

            return this.insert(roomId, winningNumber, salt, hash)
                .then(this.getById)
                .then(props => new this(props, limits));
        });
    }

    static insert(room_id, winning_number, salt, hash) {
        return new Promise((resolve, reject) => {
            db.query(`select coalesce(max(number), 0) as number from ${config.tables.round} where room_id = ?`, room_id, (err, result) => {
                if (err) return reject(err);

                db.query(
                    `insert into ${config.tables.round} set ?, number = 1 + ?`,
                    [{room_id, winning_number, salt, hash}, result[0].number], (err, result) => {
                        if (err) return reject(err);
                        resolve(result.insertId);
                    }
                );
            });
        });
    }

    static getById(id) {
        return new Promise((resolve, reject) => {
            db.query(`select * from ${config.tables.round} where id = ?`, id, (err, result) => {
                if (err) return reject(err);
                resolve(result.shift());
            });
        });
    }

    static get state() {
        return {
            NEW: 'new',
            START: 'start',
            END: 'end',
            FAIL: 'fail'
        };
    }    
	
	static getAnim() {
        return this.anim;
    }

    get tickets() {
        return Math.round(this.bank * 100);
    }

    get isBetting() {
        return this.state !== Round.state.END;
    }

    get isStarted() {
        return this.state === Round.state.START;
    }

    get countdownTime() {
        let time = this.limits.time;

        if (this.isStarted) {
            time -= Math.round((Date.now() - this.countdownStartTime) / 1000);
        }

        return time;
    }

    toJSON() {
        const players = {};

        this.players.forEach((player, id) => {
            players[id] = player;
        });
		
		if(this.animationStartTime){
			this.animationRunTime = Date.now() - this.animationStartTime;
		}
		
        return {
            number: this.number,
            bank: _.round(this.bank, 2),
            hash: this.hash,
            bets: this.bets,
			anim: this.anim,
            animationStartTime: this.animationStartTime,
            animationRunTime: this.animationRunTime,
            countdownStartTime: this.countdownStartTime,
            players
			
        };
    }

    /**
     * Make bet in round
     * @param {User} user
     * @param {Map} items
     */
    bet(user, items) {
        let player = this.players.get(user.id);

        if (!player) {
            player = new Player(user);
            this.players.set(user.id, player);
        }

        return player.bet(items).then(() => {
            console.log('%s bet %d items', player.name, items.size);

            const bet = new Bet(player, items, this.tickets + 1);

            let betSum = 0;

            items.forEach((item, id) => {
                this.pot.set(id, item);
                betSum += item.price;
            });

            return bet.place(this.id, Math.round(betSum * 100)).then(() => {
                this.bank += betSum;

                this.bets.push(bet);

                this.updateChances();

                this.emit('bet', {
                    round: _.pick(this.toJSON(), 'bank', 'players'),
                    bet
                });

                db.query(`update ${config.tables.round} set bank = bank + ? where id = ?`, [betSum, this.id], err => {
                    if (err) throw err;
                });

                if (this.isStarted) return;

                if (this.players.size === this.limits.min_players) {
                    this.start();
                }
            });
        }).catch(console.error);
    }

    start() {
        setTimeout(() => this.end(), this.limits.time * 1000);

        this.countdownStartTime = Date.now();

        this.setState(Round.state.START, {
            countdownTime: this.countdownTime,
            countdownStartTime: this.countdownStartTime
        });

        db.query(`update ${config.tables.round} set state = ? where id = ?`, [this.state, this.id]);
    }

    end() {
        const winningTicket = Math.floor(this.tickets * this.winningNumber);
		if(winningTicket === 0){ winningTicket = 1; }
		
        let winningBet = this.bets.find(bet => bet.isWinning(winningTicket));
        let winningPos = this.bets.indexOf(winningBet);
        this.winner = winningBet.player;
		this.anim = this.calculateAnimation(winningTicket, winningPos);
		this.animationStartTime = Date.now();
		
        this.setState(Round.state.END, {
            player: this.winner.id,
            winningPercent: _.round(winningTicket / this.tickets * 100, 2),
			anim: this.anim
        });

        new Rake(this.id, this.winner.chance, this.pot, this.bank);

        Deposit.addWinning(this.winner.id, [...this.pot.values()]).catch(error => console.error(error));

        setTimeout(() => {this.emit('win', this.winner)}, config.ROUND_TIMEOUT);

        db.query(`update ${config.tables.round} set ? where id = ?`, [{
            bank: this.bank,
            state: this.state,
            winning_ticket: winningTicket,
            winner_id: this.winner.id,
            chance: this.winner.chance
        }, this.id]);
    }

    /**
     * Update round state
     * @param {string} state
     * @param {Object} [data]
     */
    setState(state, data = {}) {
        this.state = state;

        this.emit(`state.${this.state}`, Object.assign({state: this.state}, data));
    }

    // @todo ensure chances sum === 100
    updateChances() {
        this.players.forEach(player => {
            player.chance = _.round(player.betSum / this.bank * 100, 2);
        });
    }

    static getHistoryByRoomId(roomId){
        return new Promise((resolve, reject) => {
            db.query(
                `select u.avatar as avatar, u.name as name, r.bank, cast(r.winning_number as char(19)) as winningTicket,
                    r.chance, r.hash, r.salt
                from ${config.tables.round} r
                join ${config.tables.user} u on u.id = r.winner_id
                where r.room_id = ? and r.state = ?
                order by r.updated desc limit 10`,
                [roomId, this.state.END],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    quit() {
        console.log('Quitting round %d...', this.id);
        
        return new Promise((resolve, reject) => {
            db.query(
                `update ${config.tables.round} set state = ? where id = ?`,
                [this.constructor.state.FAIL, this.id],
                err => {
                    if (err) return reject(err);
                    
                    resolve(this.returnBetItems().then(() => {
                        this.setState(this.constructor.state.FAIL);
                    }));
                }
            );
        });
    }

    returnBetItems() {
        if (!this.bets.length) {
            console.log('No bets in round %d', this.id);
            return Promise.resolve();
        }

        console.log('Returning items to players in round %d...', this.id);
        
        return new Promise((resolve, reject) => {
            db.query(
                `update ${config.tables.deposit} set status = ? where id in (
                    select distinct deposit_id from ${config.tables.betDeposit} where bet_id in (?)
                )`,
                [DepositItem.status.ACTIVE, this.bets.map(bet => bet.id)],
                (err, result) => {
                    if (err) return reject(err);

                    console.log('%d items successfully returned to players', result.affectedRows);
                    
                    resolve();
                }
            );
        });
    }
	
	// animation
	
	calculateAnimation(winningTicket, winningBetPosition){		
		
		const animSpan = 2000; // anim bar width in pixels
		let ticketsSum = 0,
			internalPoint = 0,
			animProp = 0,
			realSum = 0,
			animData = {
				winningPoint:0,
				winningBetPosition:winningBetPosition,
				bets:[]
			}
		
		// assemble bets
		
		for(let i = 0; i < this.bets.length; i++){
			let bet = {
				ticketsNum: this.bets[i].ticketsTo - this.bets[i].ticketsFrom,
				player: this.bets[i].player,
			}
			ticketsSum = ticketsSum + bet.ticketsNum;
			if(winningBetPosition == i){
				internalPoint = (winningTicket - this.bets[i].ticketsFrom) / bet.ticketsNum;
			}
			animData.bets.push(bet);

		} 
		
		// recalculate bet sizes
		
		animProp = animSpan / ticketsSum;
		animData.bets.map(bet => {
			bet.pixels = Math.floor(bet.ticketsNum * animProp);
			if(bet.pixels == 0){
				bet.pixels == 1;
			}
			realSum = realSum + bet.pixels;
		});
		
		// adjust last bet
		
		let diff = animSpan - realSum,
			realPrevSum = 0;
			console.log("Animation diff: real sum is: " + realSum + "px, diff is: " +diff+ "px");
		if(diff != 0){
			animData.bets[0].pixels = animData.bets[0].pixels + diff;
		}
		
		for(let i = 0; i < animData.bets.length; i++){
			if(i == winningBetPosition){
				console.log("Winning bet is " + i + ", internalPoint is " + internalPoint + ", realPrevSum is "+ realPrevSum +"px");
				animData.winningPoint = Math.ceil(animData.bets[i].pixels * internalPoint) + realPrevSum;
				break;
				
			} else {
				
				realPrevSum = realPrevSum + animData.bets[i].pixels;
				
			}
		}
		
		return animData;
		// calculate real winning position
		

	}
	

}

module.exports = Round;
