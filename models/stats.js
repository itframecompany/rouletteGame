const EventEmitter = require('events');
const moment = require('moment');

const db = require('../libs/db');
const user = require('./user');

class Stats extends EventEmitter {

    static record() {

        return new Promise((resolve, reject) => {

            let n = this.getDateTime(0),
                y = this.getDateTime(86400),
                by = this.getDateTime(172800);

            return Promise.all([this.fetchPlayersNum(y, n), this.fetchItemsNum(y, n), this.fetchRoundData(y, n)]).then(([playersNum, itemsNum, roundData]) => {

                roundData['playersNum'] = playersNum;
                roundData['itemsNum'] = itemsNum;
				
                resolve(roundData);

            }).catch(reject);

        });

    }

    static recordAdminGeneral() {

		console.log('Admin stats queued')
		
        return new Promise((resolve, reject) => {

            let n = this.getDateTime(0),
                y = this.getDateTime(86400), // 1 day
                by = this.getDateTime(172800), // 2 days
                at = this.getDateTime(86400000); // 1000 days

            return Promise.all([this.fetchPlayersNum(at, n), this.fetchRoundDataAdmin(y, n), this.fetchRoundDataAdmin(by, y), this.fetchBotItems(), this.fetchNewSignups(y, n), this.fetchNewSignups(by, y), this.fetchPlayersNum(y, n), this.fetchPlayersNum(by, y), this.fetchNewPlayers(y, n), this.fetchNewPlayers(by, y), this.fetchRoundDataAdmin(at, n)]).then(([playersNumTotal, roundDataToday, roundDataYesterday, botItemData, newSignupsToday, newSignupsYesterday, playersNumToday, playersNumYesterday, newPlayersToday, newPlayersYesterday, roundDataTotal]) => {
				
			let data = {
				
				totalPlayers_alltime:playersNumTotal,
				totalPlayers_today: playersNumToday,
				totalPlayers_yesterday: playersNumYesterday,			
				newPlayers_today: newPlayersToday,
				newPlayers_yesterday: newPlayersYesterday,				
				newSignups_today: newSignupsToday,
				newSignups_yesterday: newSignupsYesterday,				
				games_today: roundDataToday.roundsNum,
				games_yesterday: roundDataYesterday.roundsNum,				
				bankTotal_today: roundDataToday.totalSum.toFixed(2),
				bankTotal_yesterday: roundDataYesterday.totalSum.toFixed(2),				
				bankAvg_today: (roundDataToday.totalSum / roundDataToday.roundsNum).toFixed(2),
				bankAvg_yesterday: (roundDataYesterday.totalSum / roundDataYesterday.roundsNum).toFixed(2),				
				rakeReal_today: roundDataToday.rakeReal.toFixed(2),
				rakeReal_yesterday: roundDataYesterday.rakeReal.toFixed(2),				
				rakeIdeal_today: roundDataToday.rakeIdeal.toFixed(2),
				rakeIdeal_yesterday: roundDataYesterday.rakeIdeal.toFixed(2),				
				botItemsNum: botItemData.totalNum,
				botItemsSum: botItemData.totalSum.toFixed(2),
				games_alltime:roundDataTotal.roundsNum,
				rakeReal_alltime:roundDataTotal.rakeReal.toFixed(2)
			};
			
			console.log('Admin stats ready')
			
            resolve(data);

            }).catch((error) => {
				
				reject(error);
				
			});

        });

    }

    static fetchOnline() {

        return 0;

    }

    static fetchPlayersNum(timeFrom, timeTo) {

        return new Promise((resolve, reject) => {

            db.query('select count(distinct user_id) as ct from bet where created > ? AND created < ?', [timeFrom, timeTo], (err, result) => {

                if (err) {

                    return reject(err);

                } else {
					
					console.log('Players num ready');
                    resolve(result.shift().ct);

                }

            });

        });

    }

    static fetchItemsNum(timeFrom, timeTo) {

        return new Promise((resolve, reject) => {

            db.query(
                `select count(bd.deposit_id) as ct
                from bet b
                join bet_deposit bd on bd.bet_id = b.id
                where created > ? AND created < ?`,
                [timeFrom, timeTo], (err, result) => {
                    if (err) {
						
						console.log('Items num error')
                        return reject(err);
                    } else {
						
						console.log('Items num ready')
                        return resolve(result.shift().ct);
                    }

                }
            );

        });

    }

    static fetchNewPlayers(timeFrom, timeTo) {

        return new Promise((resolve, reject) => {

            db.query('select count(distinct bet.user_id) as count from bet left join user on bet.user_id = user.id where user.created > ? AND user.created < ?', [timeFrom, timeTo], (err, result) => {

                if (err) {

					console.log('New players error: ' + util.inspect(err))
                    return reject(err);

                } else {

					console.log('New players ready')
                    resolve(result.shift().count);

                }

            });

        });

    }

    static fetchNewSignups(timeFrom, timeTo) {

        return new Promise((resolve, reject) => {

            db.query('select count(id) as count from user where created > ? AND created < ?', [timeFrom, timeTo], (err, result) => {

                if (err) {

					console.log('New signups error: ' + util.inspect(err))
                    return reject(err);

                } else {

					console.log('New signups ready')
                    resolve(result.shift().count);

                }

            });

        });

    }

    static fetchBotItems() {

        return new Promise((resolve, reject) => {

            db.query('select item.price from deposit left join item on deposit.item_id = item.id where deposit.status = "active" and deposit.user_id = 1', (err, result) => {

                if (err) {
					
					console.log('Bot items error')
                    return reject(err);

                } else {

                    let botItems = {

                        totalNum: 0,
                        totalSum: 0

                    }
                    botItems.totalNum = result.length;

                    result.map((item) => {

                        if (item.price > 0) {

                            botItems.totalSum = botItems.totalSum + item.price;

                        }

                    });
					
					console.log('Bot items ready')
                    resolve(botItems);

                }

            });

        });

    }

    static fetchRoundData(timeFrom, timeTo) {

        return new Promise((resolve, reject) => {

            db.query('select round.id, round.bank, user.avatar from round left join user on user.id = round.winner_id where round.state = "end" and round.updated > ? AND round.updated < ?', [timeFrom, timeTo], (err, rows) => {

                if (err) {

					console.log('Round data error')
                    return reject(err);

                } else {

                    if (!rows.length) {
                        return resolve({roundsNum: 0, totalSum: 0, biggestWinSum: 0, biggestWinAvatar: '/img/avatar_default.jpg'});
                    }

                    rows.sort(function (a, b) {

                        return b.bank - a.bank;

                    });                  
					
					let totalSum = 0;
					rows.forEach(function (i) {

                        totalSum = totalSum + i.bank;

                    });
					
                    let res = {roundsNum: rows.length, totalSum: totalSum, biggestWinSum: rows[0].bank, biggestWinAvatar: rows[0].avatar};
					console.log('Round data ready')
                    return resolve(res);

                }

            });

        });

    }    
	
	static fetchRoundDataAdmin(timeFrom, timeTo) {

        return new Promise((resolve, reject) => {

            db.query('select round.id, round.bank, rake.ideal_sum, rake.real_sum from round left join rake on rake.round_id = round.id where round.state = "end" and round.updated > ? AND round.updated < ?', [timeFrom, timeTo], (err, rows) => {

                if (err) {
					
					console.log('Round data error')
                    return reject(err);

                } else {

                    if (!rows.length) {
                        return resolve({roundsNum: 0, totalSum: 0, rakeIdeal:0, rakeReal:0});
                    }

                    rows.sort(function (a, b) {

                        return b.bank - a.bank;

                    });                  
					
					let totalSum = 0, rakeReal = 0, rakeIdeal = 0;
					rows.forEach(function (i) {

                        totalSum = totalSum + i.bank;
                        rakeReal = rakeReal + i.real_sum;
                        rakeIdeal = rakeIdeal + i.ideal_sum;

                    });
					
                    let res = {roundsNum: rows.length, totalSum: totalSum,  rakeIdeal:rakeIdeal, rakeReal:rakeReal};
					console.log('Round data ready')
                    return resolve(res);

                }

            });

        });

    }

    static fetchPlayer(id) {

        return new Promise((resolve, reject) => {

            Promise.all([this.fetchPlayerData(id), this.fetchPlayerGames(id), this.fetchPlayerWins(id)]).then(([userObj, played, wins]) => {

                //console.log('User stats results:' + results);

                let playerObj = {
                    days: this.getDays(userObj.created),
                    winnings: wins.winnings,
                    played: played.games,
                    won: wins.won
                }

                return resolve(playerObj);

            }, (err) => {
                return reject(console.log(err))
            });


        });

    }

    static fetchPlayerData(id) {

        return new Promise((resolve, reject) => {

            db.query('select * from user where id = ?', id, (err, result) => {

                if (err) {

                    return reject(err);

                } else {

                    return resolve(result.shift());

                }

            });

        });

    }

    static fetchPlayerGames(id) {

        return new Promise((resolve, reject) => {

            db.query('select count(distinct round_id) as games from bet where user_id = ?', id, (err, result) => {

                if (err) {

                    return reject(err);

                } else {

                    return resolve(result.shift());

                }

            });

        });

    }

    static fetchPlayerWins(id) {

        return new Promise((resolve, reject) => {

            db.query('select bank from round where winner_id = ?', id, (err, results) => {

                if (err) {

                    return reject(err);

                } else {

                    let res = {winnings: 0, won: results.length},
                        sum = 0;

                    for (let i = 0; i < results.length; i++) {

                        sum = sum + parseFloat(results[i].bank);

                    }

                    sum = sum.toFixed(2);
                    res.winnings = sum;
                    return resolve(res);

                }

            });

        });

    }

    static getDateTime(offset) {

        // offset in seconds
        return new Date(Date.now() - (offset * 1000)); //.toISOString().slice(0, 19).replace('T', ' ');

    }

    static getDays(datetime) {
        return moment().diff(moment(datetime), 'days');
    }

}

module.exports = Stats;
