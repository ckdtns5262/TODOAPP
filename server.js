// express 라이브러리 기본 셋팅
const express = require('express');
require('dotenv').config()
const app = express();
const http = require('http').createServer(app);
const {Server} = require('socket.io')
const io = new Server(http);

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }))
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override')
app.use(methodOverride('_method'))
app.set('view engine', 'ejs')
const {ObjectId} = require('mongodb')

// static 파일을 보관하기 위해 public 폴더를 쓸거다
app.use('/public', express.static('public'))

var db;
MongoClient.connect(process.env.DB_URL,
    function (error, client) {
        var db  = client.db('todoapp')
        // 8080 port로 웹서버를 열고 잘 열리면 console 출력
        if (error) return console.log(error)

        app.post('/add', function (request, response) {
            response.send('전송완료')
            console.log(request.body.title)
            console.log(request.body.date)
            db.collection('counter').findOne({name : '게시물갯수'}, function(error, result){
                console.log(result.totalPost)
                var 총게시물갯수 = result.totalPost

                var 저장할거 = { _id : (총게시물갯수+1), 제목: request.body.title, 날짜: request.body.date , 작성자 : request.user._id}

                db.collection('post').insertOne(저장할거,
                function (error, result) {
                    console.log('저장완료')
                db.collection('counter').updateOne({name : '게시물갯수'},{ $inc:{totalPost : 1}},function(error, result){  // update operator $set => 바꿀값
                    if(error) return console.log(error)                                                                 // increment operator $inc => 기존값에 더해줄 값
                })   
                });                                                                                         
                
            })
        })
        app.post('/message',isLogin, function(req, res){
            var 채팅내용 = { 
                parent : req.body.parent,
                userid : req.user._id,
                content : req.body.content,
                date : new Date()
                }
            db.collection('message').insertOne(채팅내용)
            .then((result)=>{
                res.send(result)
            }).catch(()=>{

            })
        })
        // 여기로 get요청하면 실시간 채널이 오픈이 됨
        app.get('/message/:id', isLogin, function(req, res){
            res.writeHead(200,{
                "Connection" : "keep-alive",
                "Content-Type" : "text/event-stream",
                "Cache-Control" : "no-cache"
            });
            db.collection('message').find({parent : req.params.id}).toArray()
            .then((result)=>{
            res.write('event: test\n')
            res.write('data: ' + JSON.stringify(result) + '\n\n')
            })

            const pipeline = [
                { $match : { 'fullDocument.parent': req.params.id}}
            ];
            const collection = db.collection('message');
            const changeStream = collection.watch(pipeline); // watch()를 붙이면 실시간 감시해줌
            // 해당 컬렉션에 변동생기면 여기 코드 실행됨
            changeStream.on('change', (result)=>{
                res.write('event: test\n')
                res.write('data: ' + JSON.stringify([result.fullDocument]) + '\n\n')
            })
        })
    
      
        http.listen(8080, function () {
            console.log('listening on 8080')
        });

        app.get('/socket',function(req, res) {
            res.render('socket.ejs')
        })
        // 누가 웹소켓 접속하면 내부 코드 실행해주세요
        io.on('connection', function(socket){
            console.log('유저 접속됨')
            // 채팅방 만들고 입장
            socket.on('joinroom',function(data){
                socket.join('room1')
            })

            socket.on('room1-send',function(data){
                io.to('room1').emit('broadcast',data)
            })



            socket.on('user-send',function(data){
                console.log(data)
                io.emit('broadcast', data) // 모든 유저에게 메세지 보내줌
                io.to(socket.id).emit('broadcast', data) // to 특정유저에게만 보내줌
            })

        })
        

        app.get('/list', function (request, response){
            // db에 저장된 post라는 collection 안의 모든 데이터 꺼내기
            db.collection('post').find().toArray(function(error, result){
                console.log(result)
                response.render('list.ejs', {posts : result})
            })
        })
        app.delete('/delete', function(request, response){
            request.body._id = parseInt(request.body._id)
            db.collection('post').deleteOne({_id : request.body._id , 작성자 : request.user._id}, function(error, result){
              console.log('삭제완료')
              
              response.status(200).send({ message : '성공했습니다'})
            })
            
          });
          app.get('/detail/:id', function(request, response){
            db.collection('post').findOne({_id :parseInt(request.params.id)},function(error, result){
                console.log(result)
                response.render('detail.ejs', { data : result})
            })
         })
         app.get('/edit/:id', function(request,response){
            db.collection('post').findOne({_id:parseInt(request.params.id)}, function(error, result){
            response.render('edit.ejs',{ post : result })

            })
        })
        app.put('/edit', function(request, response){
            db.collection('post').updateOne({_id : parseInt(request.body.id)}, 
            {$set : {제목 : request.body.title, 날짜 : request.body.date}}, function(err, res){
                console.log("수정완료")
                response.redirect('/list')
            })
        })
        app.get('/login', function(request, response){
            response.render('login.ejs')
        })
        app.post('/login', passport.authenticate('local',{
            failureRedirect : '/fail'
        }),function(request, response){
            response.redirect('/')
        })
        app.get('/fail', function(request, response){
            response.render('fail.ejs')
        })
    
        passport.use(new LocalStrategy({
            usernameField: 'id',
            passwordField: 'pw',
            session: true,
            passReqToCallback: false,
          }, function (입력한아이디, 입력한비번, done) {
            console.log(입력한아이디, 입력한비번);
            db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
              if (에러) return done(에러)
              if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
              if (입력한비번 == 결과.pw) {
                return done(null, 결과)
              } else {
                return done(null, false, { message: '비번틀렸어요' })
              }
            })
          }));
          passport.serializeUser(function(user,done){
            done(null, user.id)
          })
          passport.deserializeUser(function(아이디,done){
            db.collection('login').findOne({id: 아이디}, function(err,res){
                done(null, res)

            })
          })
          app.post('/register', function(req, res){
            db.collection('login').insertOne({id : req.body.id , pw : req.body.pw}, function(err, result){
                res.redirect('/')
            })
          })

          app.get('/mypage', isLogin,function(request,response){
            console.log(request.user)
            response.render('mypage.ejs', {사용자 : request.user})
        })
        function isLogin(request,response, next){
            if(request.user){
                next()
            } else {
                response.send('로그인 안함')
            }
        }
        app.post('/chatroom', isLogin, function(req, res){

            var 채팅게시물 = {
                title : '땡땡채팅방',
                member : [ObjectId(req.body.당한사람id), req.user._id], 
                date : new Date() 
            }

            db.collection('chatroom').insertOne(채팅게시물, 
                function(err, res){
                }
            ).then((result)=>{
                res.send('성공')
            })
        })



        app.get('/search', (req, res)=>{
            var 검색조건 = [
                {
                    $search : {
                        index : 'titleSearch',
                        text : {
                            query : req.query.value,
                            path : "제목" // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
                        }
                    }
                }, 
                { $sort : {_id : -1}},
                { $limit : 10 },
               //  { $project : {제목 : 1, _id : 0, score : {$meta : "searchScore"}}}

            ]
            db.collection('post').aggregate(검색조건).toArray((err,result)=>{
                console.log(result)
                res.render('search.ejs', {posts : result})
            })
        }) 

        app.get('/chat', isLogin, function(req, res){
            db.collection('chatroom').find({member : req.user._id}).toArray().then((result)=>{
                res.render('chat.ejs', {data : result})
            })
        })

    })



app.get('/upload', function(req, res){
    res.render('upload.ejs')
})
let multer = require('multer')
var storage = multer.diskStorage({
    destination : function(req, file, cb){
        cb(null, './public/image')
    }, 
    filename : function(req,file, cb){
        cb(null, file.originalname)
    }
})

var upload = multer({
    storage : storage,
    fileFilter : function(req, file, callback){
        var ext = path.extname(file.originalname);
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg'){
            return callback(new Error('PNG, JPG만 업로드하세요'))
        }
        callback(null, true)
    },
    limits : {
        fileSize : 1024 * 1024
    }

})

app.post('/upload', upload.single('profile') , function(req, res){
    res.send('업로드 완료')
})

app.get('/image/:imageName', function(req, res){
    res.sendFile(__dirname + '/public/image/' + req.params.imageName)
})

app.get('/', function (request, response) {
    response.render('index.ejs')
})

app.get('/write', function (request, response) {
    response.render('write.ejs')
})

app.use('/shop', require('./routes/shop'))
app.use('/board/sub', require('./routes/board'))



const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session');
const { response } = require('express');


// app.use(미들웨어) : 요청 - 응답 중간에 뭔가 실행되는 코드 *미들웨어 : 요청과 응답 사이에 실행되는 코드
app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}))
app.use(passport.initialize())
app.use(passport.session())



