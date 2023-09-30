const mongoose = require('mongoose')
const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            })
        console.log('Database connection successful')
    } catch (e) {
        console.log(`Database connection error: ${e.message}`)
        process.exit(1)
    }
}

module.exports = dbConnect