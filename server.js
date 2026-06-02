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
    res.sendFile(path.join(__dirname, 'node_modules', 'sitelogo.png'));
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
    res.render('signup', { user: req.session.user });
});

// 유저가 입력한 데이터를 받아서 DB에 저장하는 라우터
app.post('/signup', async (req, res) => {
    try {
        // 유저가 입력한 아이디와 비밀번호 가져옴
        const { username, password } = req.body;

        // 비밀번호를 암호화
        const hashedPassword = await bcrypt.hash(password, 10);

        // 설계도를 바탕으로 새 유저 데이터 생성
        const newUser = new User({
            username: username,
            password: hashedPassword
        });

        // 몽고DB에 저장!!
        await newUser.save();

        res.send('<h1>가입 성공! DB에 저장되었습니다.</h1>');
    } catch (error) {
        console.log(error);
        res.send('<h1>가입 실패 (이미 존재하는 아이디일 수 있습니다.)</h1>');
    }
});

// 로그인 화면(login.ejs)을 보여주는 라우터
app.get('/login', (req, res) => {
    res.render('login', { user: req.session.user });
});

// 유저가 입력한 아이디/비밀번호를 검증하는 라우터
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 데이터베이스에서 해당 아이디를 가진 유저가 있는지 확인
        const user = await User.findOne({ username: username });
        if (!user) {
            return res.send('<h1>로그인 실패: 아이디를 찾을 수 없습니다.</h1>');
        }

        // 입력한 비밀번호와 DB에 암호화된 비밀번호가 일치하는지 비교
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.send('<h1>로그인 실패: 비밀번호가 틀렸습니다.</h1>');
        }

        // 일치하면 세션에 유저 고유 ID와 이름을 기록 (로그인 처리)
        req.session.user = {
            id: user._id,
            username: user.username
        };

        // 로그인이 완료되면 홈 화면('/')으로 강제 이동(리다이렉트)
        res.redirect('/');

    } catch (error) {
        console.log(error);
        res.send('<h1>로그인 중 서버 오류가 발생했습니다.</h1>');
    }
});

// 로그아웃을 처리하는 라우터
app.get('/logout', (req, res) => {
    // 세션 방을 폭파시켜서 로그인 기록을 지움
    req.session.destroy(() => {
        res.redirect('/'); // 지운 후 홈 화면으로 이동
    });
});

// 개별 서브 페이지
app.get('/info', (req, res) => res.render('info', { user: req.session.user }));
app.get('/board', (req, res) => res.render('board', { user: req.session.user }));
app.get('/friends', (req, res) => res.render('friends', { user: req.session.user }));
app.get('/items', (req, res) => res.render('items', { user: req.session.user }));

// 마이페이지는 로그인이 안 되어 있으면 로그인 창으로 튕겨냅니다.
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