const fs = require("fs");

class MemoryStorage {
    static path = "./memory/memory.json";
    static getAllStorage() {
        const file = fs.readFileSync(this.path, "utf8");
        return JSON.parse(file);
    }

    static getStorage(key) {
        const storage = MemoryStorage.getAllStorage();
        return storage[key];
    }

    static setStorage(key, value) {
        const storage = MemoryStorage.getAllStorage();
        storage[key] = value;
        fs.writeFileSync(this.path, JSON.stringify(storage));
    }

    static deleteStorage(key) {
        const storage = MemoryStorage.getAllStorage();
        delete storage[key];
        fs.writeFileSync(this.path, JSON.stringify(storage));
    }
}

module.exports = MemoryStorage;