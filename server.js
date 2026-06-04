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

app.get('/items', (req, res) => res.render('items', { user: req.session.user }));

// 판매글 작성 페이지 (로그인한 사람만 접근 가능)
app.get('/items/write', (req, res) => {
    if (!req.session.user) {
        return res.send(`<script>alert("로그인이 필요한 서비스입니다."); window.location.href="/login";</script>`);
    }
    res.render('items_write', { user: req.session.user });
});

// 개별 서브 페이지
app.get('/info', (req, res) => res.render('info', { user: req.session.user }));
app.get('/board', (req, res) => res.render('board', { user: req.session.user }));
app.get('/friends', (req, res) => res.render('friends', { user: req.session.user }));
app.get('/items', (req, res) => res.render('items', { user: req.session.user }));

// 판매글 작성 폼 (GET)
app.get('/items/write', (req, res) => {
    if (!req.session.user) {
        return res.send(`<script>alert("로그인이 필요한 서비스입니다."); window.location.href="/login";</script>`);
    }
    res.render('items_write', { user: req.session.user });
});

// 작성된 판매글 처리 (POST)
app.post('/items/write', (req, res) => {
    // 임시로 DB 연동 전이므로 성공 팝업만 띄우고 판매 물품 정보 페이지로 이동
    res.send(`<script>alert("판매글이 성공적으로 등록되었습니다!"); window.location.href="/items";</script>`);
});

// 내 판매 물품 관리 페이지 (GET)
app.get('/items/manage', (req, res) => {
    if (!req.session.user) {
        return res.send(`<script>alert("로그인이 필요한 서비스입니다."); window.location.href="/login";</script>`);
    }
    res.render('items_manage', { user: req.session.user });
});

// 판매글 수정 페이지 띄우기 (GET)
app.get('/items/edit', (req, res) => {
    if (!req.session.user) {
        return res.send(`<script>alert("로그인이 필요한 서비스입니다."); window.location.href="/login";</script>`);
    }
    res.render('items_edit', { user: req.session.user });
});

// 판매글 수정 데이터 처리 (POST)
app.post('/items/edit', (req, res) => {
    // 임시 / 나중에 이곳에 DB 업데이트 코드가 들어감
    res.send(`<script>alert("판매글이 성공적으로 수정되었습니다!"); window.location.href="/items/manage";</script>`);
});

// 판매글 삭제 처리 (POST)
app.post('/items/delete', (req, res) => {
    // 임시 / 나중에 이곳에 DB 삭제 코드가 들어갑
    res.send(`<script>alert("판매글이 삭제되었습니다."); window.location.href="/items/manage";</script>`);
});

// 마이페이지는 로그인이 안 되어 있으면 로그인 창으로 튕겨냄
app.get('/mypage', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('mypage', { user: req.session.user });
});

app.get('/terms', (req, res) => res.render('terms', { user: req.session.user }));
app.get('/privacy', (req, res) => res.render('privacy', { user: req.session.user }));
app.get('/copyright', (req, res) => res.render('copyright', { user: req.session.user }));

// 서버 구동
app.listen(PORT, () => {
    console.log(`서버 가동, 주소 : http://localhost:${PORT}`);
});