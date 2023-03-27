// express 라이브러리 기본 셋팅
const express = require('express');
require('dotenv').config()
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }))
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override')
app.use(methodOverride('_method'))
app.set('view engine', 'ejs')

// static 파일을 보관하기 위해 public 폴더를 쓸거다
app.use('/public',express.static('public'))

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

                db.collection('post').insertOne({ _id : (총게시물갯수+1), 제목: request.body.title, 날짜: request.body.date },function (error, result) {
                    console.log('저장완료')
                db.collection('counter').updateOne({name : '게시물갯수'},{ $inc:{totalPost : 1}},function(error, result){  // update operator $set => 바꿀값
                    if(error) return console.log(error)                                                                 // increment operator $inc => 기존값에 더해줄 값
                })   
                });                                                                                         
                
            })
        })
      
        app.listen(8080, function () {
            console.log('listening on 8080')
        });

        app.get('/list', function (request, response){
            // db에 저장된 post라는 collection 안의 모든 데이터 꺼내기
            db.collection('post').find().toArray(function(error, result){
                console.log(result)
                response.render('list.ejs', {posts : result})
            })
        })
        app.delete('/delete', function(request, response){
            request.body._id = parseInt(request.body._id)
            db.collection('post').deleteOne(request.body, function(error, result){
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
    })

app.get('/', function (request, response) {
    response.render('index.ejs')
})

app.get('/write', function (request, response) {
    response.render('write.ejs')
})


const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')


// app.use(미들웨어) : 요청 - 응답 중간에 뭔가 실행되는 코드
app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}))
app.use(passport.initialize())
app.use(passport.session())


