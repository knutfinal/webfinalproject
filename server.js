require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

const User = require('./models/User'); // 유저 설계도(만들어온것) 불러오기
const bcrypt = require('bcryptjs');    // 비밀번호 암호화 도구
const mongoclient = require("mongodb").MongoClient;
const ObjId = require('mongodb').ObjectId;

require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

const Item = require('./models/Item');
const Friend = require('./models/Friend');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'dongne_market',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    }
});
const upload = multer({ storage: storage });

app.use(express.static('public'));

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
app.use('/krds', express.static('node_modules/krds-uiux/resources'));
app.use('/krds/img/img', express.static('node_modules/krds-uiux/resources/img'));
const path = require('path');
app.get('/sitelogo.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sitelogo.png'));
});

app.use(session({
    secret: 'KNUThorray260601', // 세션을 암호화할 키
    resave: false,               // 데이터가 변경되지 않아도 세션을 다시 저장할지?
    saveUninitialized: false,    // 비어있는 세션을 저장할지?
    cookie: { secure: false }    // http 환경에서도 세션이 작동하도록
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB 연결완료!!!'))
  .catch((err) => console.log('MongoDB 연결 오류: ', err));

app.get('/', (req, res) => {
    // views 폴더의 index.ejs를 화면에 띄우고, 로그인한 유저 정보를 함께 넘겨줌
    res.render('index', { user: req.session.user });
});

// 회원가입 화면(signup.ejs)을 보여주는 라우터
app.get('/signup', (req, res) => {
    res.render('signup', { user: req.session.user, errorMessage: null });
});

// 유저가 입력한 데이터를 받아서 DB에 저장하는 라우터
app.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username: username, password: hashedPassword });
        
        await newUser.save();

        // 성공하면 로그인 페이지로 보내면서 모달 메시지 띄움
        res.render('login', { user: null, errorMessage: "가입 성공! 환영합니다.<br>로그인을 진행해주세요." });
    } catch (error) {
        console.log(error);
        // 실패하면 회원가입 페이지를 유지하며 모달 띄움
        res.render('signup', { user: null, errorMessage: "가입 실패: 이미 존재하는 아이디이거나 오류가 발생했습니다." });
    }
});

// 로그인 화면(login.ejs)을 보여주는 라우터
app.get('/login', (req, res) => {
    res.render('login', { user: req.session.user, errorMessage: null });
});

// 유저가 입력한 아이디/비밀번호를 검증하는 라우터
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username: username });
        if (!user) {
            // 아이디 없을 때 화면 유지하며 모달 메시지 전달
            return res.render('login', { user: null, errorMessage: "로그인을 실패했습니다.<br>아이디를 찾을 수 없습니다." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // 비밀번호 틀렸을 때 화면 유지하며 모달 메시지 전달
            return res.render('login', { user: null, errorMessage: "로그인을 실패했습니다.<br>아이디 비밀번호를 확인해 주세요." });
        }

        req.session.user = {
            id: user._id,
            username: user.username
        };

        // 로그인 완료시 마이페이지 이동
        res.redirect('/mypage');

    } catch (error) {
        console.log(error);
        res.render('login', { user: null, errorMessage: "서버 오류가 발생했습니다.<br>잠시 후 다시 시도해주세요." });
    }
});

// 로그아웃을 처리하는 라우터
app.get('/logout', (req, res) => {
    // 세션 방을 폭파시켜서 로그인 기록을 지움
    req.session.destroy(() => {
        res.redirect('/'); // 지운 후 홈 화면으로 이동
    });
});

// 전체 물품 및 내 물품 목록 보기 (GET)
app.get('/items', async (req, res) => {
    try {
        const items = await Item.find().sort({ createdAt: -1 }); // 최신순으로 모든 물품 조회
        let myItems = [];
        if (req.session.user) {
            myItems = await Item.find({ author: req.session.user.username }).sort({ createdAt: -1 });
        }
        res.render('items', { user: req.session.user, items: items, myItems: myItems });
    } catch (err) {
        res.send("데이터를 불러오는 중 오류가 발생했습니다.");
    }
});

// 판매글 작성 페이지 띄우기 (GET)
app.get('/items/write', (req, res) => {
    if (!req.session.user) return res.send(`<script>alert("로그인이 필요합니다."); window.location.href="/login";</script>`);
    res.render('items_write', { user: req.session.user });
});

// 작성된 판매글 DB 저장 (POST)
app.post('/items/write', upload.single('itemImage'), async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        const imagePath = req.file ? req.file.path : '';
        
        const newItem = new Item({
            title: req.body.itemTitle,
            price: req.body.itemPrice,
            content: req.body.itemContent,
            image: imagePath,
            author: req.session.user.username
        });
        
        await newItem.save(); // DB에 저장!
        res.send(`<script>alert("성공적으로 등록되었습니다!"); window.location.href="/items";</script>`);
    } catch (err) {
        console.log(err);
        res.send(`<script>alert("등록 중 오류가 발생했습니다."); window.location.href="/items/write";</script>`);
    }
});

// 내 판매 물품 관리 페이지 (GET)
app.get('/items/manage', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        const myItems = await Item.find({ author: req.session.user.username }).sort({ createdAt: -1 });
        res.render('items_manage', { user: req.session.user, myItems: myItems });
    } catch (err) {
        res.send("오류가 발생했습니다.");
    }
});

// 판매글 수정 페이지 띄우기 (GET)
app.get('/items/edit/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        const item = await Item.findById(req.params.id);
        if (item.author !== req.session.user.username) return res.send(`<script>alert("권한이 없습니다."); window.location.href="/items";</script>`);
        res.render('items_edit', { user: req.session.user, item: item });
    } catch (err) {
        res.send("오류가 발생했습니다.");
    }
});

// 판매글 수정 DB 업데이트 (POST)
app.post('/items/edit/:id', upload.single('itemImage'), async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        const updateData = {
            title: req.body.itemTitle,
            price: req.body.itemPrice,
            content: req.body.itemContent
        };
        if (req.file) updateData.image = req.file.path;

        await Item.findByIdAndUpdate(req.params.id, updateData);
        res.send(`<script>alert("수정되었습니다!"); window.location.href="/items/manage";</script>`);
    } catch (err) {
        res.send("수정 중 오류가 발생했습니다.");
    }
});

// 판매글 DB 삭제 (POST)
app.post('/items/delete/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.send(`<script>alert("삭제되었습니다."); window.location.href="/items/manage";</script>`);
    } catch (err) {
        res.send("삭제 중 오류가 발생했습니다.");
    }
});

app.get('/info', (req, res) => res.render('info', { user: req.session.user }));
app.get('/board', (req, res) => res.render('board', { user: req.session.user }));

// 친구 관리 페이지 띄우기 (GET)
app.get('/friends', async (req, res) => {
    if (!req.session.user) return res.send(`<script>alert("로그인이 필요합니다."); window.location.href="/login";</script>`);
    try {
        // 내가 추가한 친구 목록을 DB에서 가져옴
        const friends = await Friend.find({ username: req.session.user.username }).sort({ createdAt: -1 });
        res.render('friends', { user: req.session.user, friends: friends });
    } catch (err) {
        res.send("오류가 발생했습니다.");
    }
});

// 친구 추가 처리 (POST)
app.post('/friends/add', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        const targetName = req.body.friendName.trim();
        
        // 자기 자신 추가 방지
        if (targetName === req.session.user.username) {
            return res.send(`<script>alert("자기 자신은 이웃으로 추가할 수 없습니다."); window.history.back();</script>`);
        }

        // 실제 존재하는 유저인지 확인
        const targetUser = await User.findOne({ username: targetName });
        if (!targetUser) {
            return res.send(`<script>alert("존재하지 않는 사용자입니다. 아이디를 다시 확인해주세요."); window.history.back();</script>`);
        }

        // 이미 추가된 친구인지 중복 확인
        const existingFriend = await Friend.findOne({ username: req.session.user.username, friendName: targetName });
        if (existingFriend) {
            return res.send(`<script>alert("이미 등록된 이웃입니다."); window.history.back();</script>`);
        }

        // DB에 친구 저장
        const newFriend = new Friend({ username: req.session.user.username, friendName: targetName });
        await newFriend.save();
        res.send(`<script>alert("새로운 이웃이 추가되었습니다!"); window.location.href="/friends";</script>`);
    } catch (err) {
        res.send("친구 추가 중 오류가 발생했습니다.");
    }
});

// 친구 삭제 처리 (POST)
app.post('/friends/delete/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        await Friend.findByIdAndDelete(req.params.id);
        res.send(`<script>alert("이웃이 삭제되었습니다."); window.location.href="/friends";</script>`);
    } catch (err) {
        res.send("삭제 중 오류가 발생했습니다.");
    }
});

app.get('/mypage', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        // 1. 내 친구들 아이디 목록 뽑아오기
        const myFriends = await Friend.find({ username: req.session.user.username });
        const friendNames = myFriends.map(f => f.friendName); 

        // 2. 작성자가 내 친구인 글만 최신순으로 3개 가져오기
        const recentItems = await Item.find({ author: { $in: friendNames } })
                                      .sort({ createdAt: -1 })
                                      .limit(3);

        res.render('mypage', { user: req.session.user, recentItems: recentItems });
    } catch (err) {
        console.log(err);
        res.send(`<script>alert("데이터를 불러오는 중 오류가 발생했습니다."); window.location.href="/";</script>`);
    }
});

app.get('/terms', (req, res) => res.render('terms', { user: req.session.user }));
app.get('/privacy', (req, res) => res.render('privacy', { user: req.session.user }));
app.get('/copyright', (req, res) => res.render('copyright', { user: req.session.user }));

// 에러 발생 시 경고창을 띄워주는 방어 코드
app.use((err, req, res, next) => {
    console.error("문제 발생:", err);
    res.send(`<script>alert("업로드 또는 서버 처리 중 오류가 발생했습니다: ${err.message}"); window.history.back();</script>`);
});

// 서버 구동
app.listen(PORT, () => {
    console.log(`서버 가동, 주소 : http://localhost:${PORT}`);
});
