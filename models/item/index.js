class Item {
    constructor({id, name, price = null, color, name_color, icon_url, icon_url_large}) {
        if (id) this.itemId = id;
        this.name = name;
        this.price = parseFloat(price) || null;
        this.color = color;
        this.nameColor = name_color;
        this.iconUrl = icon_url;
        this.iconUrlLarge = icon_url_large;
    }
}

module.exports = Item;