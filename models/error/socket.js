const MyError = require('./');

class SocketError extends MyError {
    static BAD_JSON(message = 'Bad json data') {
        return new this(message, 200, this.level.YELLOW);
    }

    static TRADELINK_FAIL(message = 'Failed to set tradelink') {
        return new this(message, 201, this.level.RED);
    }

    static WRONG_EVENT_TYPE(message = 'Wrong event type passed') {
        return new this(message, 202, this.level.YELLOW);
    }

    static STEAM_LOW_LEVEL(message = 'Your Steam account must have Steam level 2 and above to play on this site') {
        return new this(message, 203, this.level.RED);
    }

    static STEAM_BANNED(message = 'This Steam account is banned') {
        return new this(message, 204, this.level.RED);
    }

    static INVENTORY(message = 'Can\'t get inventory') {
        return new this(message, 205, this.level.RED);
    }
    
    static MAX_DEPOSIT_ITEMS(message = 'Maximum deposit items reached') {
        return new this(message, 206, this.level.YELLOW);
    }
}

module.exports = SocketError;