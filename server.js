// express 라이브러리 기본 셋팅
const express = require('express');
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
MongoClient.connect('mongodb+srv://ckdgus5262:ckdgus12@cluster0.o7azh20.mongodb.net/?retryWrites=true&w=majority',
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
        
    })

app.get('/', function (request, response) {
    response.render('index.ejs')
})

app.get('/write', function (request, response) {
    response.render('write.ejs')
})


