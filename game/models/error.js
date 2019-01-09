const MyError = require('../../models/error');

class GameError extends MyError {
    static NO_BET_ITEMS(message = 'No items to bet') {
        return new this(message, 100, this.level.YELLOW);
    }

    static WRONG_BET_SUM(message = 'Wrong bet sum') {
        return new this(message, 101, this.level.YELLOW);
    }

    static MAX_BET_ITEMS_REACHED(message = 'Maximum bet items amount reached') {
        return new this(message, 102, this.level.YELLOW);
    }

    static MAX_ITEMS_EXCEEDED(message = 'Room maximum items amount exceeded') {
        return new this(message, 103, this.level.YELLOW);
    }

    static WRONG_USER_ITEMS(message = 'One or more items do not belong to user') {
        return new this(message, 104, this.level.RED);
    }

    static BAD_ITEMS(message = 'Items should be an array') {
        return new this(message, 105, this.level.YELLOW);
    }

    static MISSING_ROOM_CLASS(message = 'Missing class for room') {
        return new this(message, 106, this.level.RED);
    }

    static WRONG_ROOM(message = 'Room does not exist') {
        return new this(message, 107, this.level.RED);
    }

    static ROUND_ALREADY_STARTED(message = 'Round already started') {
        return new this(message, 108, this.level.RED);
    }
    
    static NO_ACTIVE_ROUND(message = 'Room does not have active round') {
        return new this(message, 109, this.level.YELLOW);
    }
}

module.exports = GameError;