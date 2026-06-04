const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    title: { type: String, required: true },      // 글 제목
    content: { type: String, required: true },    // 글 내용
    author: { type: String, required: true },     // 작성자 아이디
    views: { type: Number, default: 0 },          // 조회수 (기본값 0)
    createdAt: { type: Date, default: Date.now }  // 작성일
});

module.exports = mongoose.model('Board', boardSchema);