const EventEmitter = require('events');

const config = require('../../config');
const db = require('../../libs/db');

const Room = require('../models/room');
const GameError = require('../models/error');

const ROOM_LIMIT_ID = 1;
const ROOM_UNLIMITED_ID = 2;

const roomClassMap = {
    [ROOM_LIMIT_ID]: Room,
    [ROOM_UNLIMITED_ID]: Room
};

class Game extends EventEmitter {
    constructor() {
        super();
        
        this.rooms = new Map();

        db.query(`select * from ${config.tables.room}`, (error, rows) => {
            if (error) return this.emit(new Error('Failed to load rooms from db'));

            rows = rows.filter(row => row.is_active);

            Promise.all(rows.map(row => this.initRoom(row))).then(() => {
                console.log('Game initialized');
                this.emit('init');
            }).catch(console.error);
        });
    }

    initRoom(props) {
        return new Promise((resolve, reject) => {
            if (!roomClassMap[props.id]) return reject(GameError.MISSING_ROOM_CLASS());

            props.key = ({
                [ROOM_LIMIT_ID]: 'limit',
                [ROOM_UNLIMITED_ID]: 'unlimited'
            })[props.id];

            const room = new roomClassMap[props.id](props);

            this.rooms.set(room.key, room);

            room.once('init', () => {
                console.log('%s room initialized', room.name);
                resolve();
            });

            room.on('update', () => this.updateRoom(room));
        });
    }
    
    updateRoom(room) {
        return new Promise((resolve, reject) => {
            db.query(`select * from ${config.tables.room} where id = ?`, room.id, (error, result) => {
                if (error) return reject(error);

                const [row] = result;

                if (!row.is_active) {
                    this.rooms.delete(room.key);
                    return;
                }

                room.initRound(row);
            });
        });
    }

    toJSON() {
        const rooms = {};

        this.rooms.forEach((room, key) => rooms[key] = room);

        return rooms;
    }

    quit() {
        console.log('Quitting game...');
        return Promise.all([...this.rooms.values()].map(room => room.quit()));
    }
}

module.exports = new Game();