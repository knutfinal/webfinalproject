const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
    username: { type: String, required: true },    // 나(친구를 추가하는 사람)의 아이디
    friendName: { type: String, required: true },  // 내가 추가한 이웃(친구)의 아이디
    createdAt: { type: Date, default: Date.now }   // 친구 추가 날짜
});

module.exports = mongoose.model('Friend', friendSchema);