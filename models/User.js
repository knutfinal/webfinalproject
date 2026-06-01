const mongoose = require('mongoose');

// User 기본 틀
const userSchema = new mongoose.Schema({

    // 로그인 기능
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // 파일 첨부 기능 (나중에 Cloudinary 이미지 URL 넣을예정)
    profileImage: { type: String, default: "" },

    // 아이템 데이터 (여러 아이템을 가질 수 있도록 배열[] 사용)
    items: [{
        itemName: String,
        itemImageUrl: String
    }],

    // 친구 기능 (다른 유저의 고유 ID(ObjectId)들을 담아두는 배열)
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // 나에게 온 친구 요청 대기열
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]         // 수락 완료된 찐친 목록
});

// 'User'라는 이름의 모델로 만들어서 밖으로 내보냄
module.exports = mongoose.model('User', userSchema);