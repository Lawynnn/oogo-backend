const mongoose = require("mongoose");
require("dotenv").config();

module.exports = mongoose.connect(`mongodb+srv://lawyn:${process.env.MONGO_PASS}@cluster0.px8nd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`, {
    dbName: "cartravel"
})
    .then(db => {
        console.log(`Connected to database ${db.connection.name}`)
        return db;
    })

