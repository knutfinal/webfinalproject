const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    title: { type: String, required: true },// 물품명
    price: { type: Number, required: true }, // 가격
    content: { type: String }, // 이미지 파일 경로
    image: { type: String }, // 상세 설명 (.txt 텍스트 포함)
    author: { type: String, required: true }, // 작성자명(username)
    createdAt: { type: Date, default: Date.now }, // 작성 시간
    status: { type: String, default: 'selling' }, // 'selling'(판매중), 'requested'(예약중), 'completed'(판매완료)
    buyer: { type: String, default: null }        // 구매 요청을 한 사용자
});

module.exports = mongoose.model('Item', itemSchema);