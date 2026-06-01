require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

const mongoclient = require("mongodb").MongoClient;
const ObjId = require('mongodb').ObjectId;

require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB 연결완료!!!'))
  .catch((err) => console.log('MongoDB 연결 오류: ', err));

app.get('/', (req, res) => {
    res.send('<h1>서버 정상 가동!</h1>');
});

app.listen(PORT, () => {
    console.log(`서버 가동, 주소 : http://localhost:${PORT}`);
});