const {Storage} = require('@google-cloud/storage')
const path = require('path')

// Initialize google cloud storage client
const storageClient = new Storage({
    keyFilename: path.join(__dirname, ('../' + process.env.G00GLE_CLOUD_KEY_FILE)),
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});


module.exports = storageClient;