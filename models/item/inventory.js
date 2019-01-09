const Item = require('./');

class InventoryItem extends Item {
    constructor({asset_id, id, name, price, color, name_color, icon_url, icon_url_large, tradable}) {
        super({id, name, price, color, name_color, icon_url, icon_url_large});
        this.assetId = Number(asset_id);
        this.tradable = tradable;
    }

    hasValidName() {
        return this.name && !this.name.toLowerCase().includes('souvenir');
    }

    hasValidPrice() {
        if (!Number.isFinite(this.price)) return false;
        return this.price > 0.5;
    }
}

module.exports = InventoryItem;
