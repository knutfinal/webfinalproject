const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    title: { type: String, required: true },     // 물품명
    price: { type: Number, required: true },     // 가격
    image: { type: String },                     // 이미지 파일 경로
    content: { type: String },                   // 상세 설명 (.txt 텍스트 포함)
    author: { type: String, required: true },    // 작성자명(username)
    createdAt: { type: Date, default: Date.now } // 작성 시간
});

module.exports = mongoose.model('Item', itemSchema);
