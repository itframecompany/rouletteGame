const MyError = require('../../models/error');

class TradeError extends MyError {
    static BAD_WITHDRAW(message = 'Bad withdraw input') {
        return new this(message, 61, this.level.YELLOW);
    }
    
    static WRONG_REQUEST_HANDLER(message = 'Wrong request handler') {
        return new this(message, 62, this.level.RED);
    }
}

module.exports = TradeError;
