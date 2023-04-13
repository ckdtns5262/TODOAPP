var router = require('express').Router();


function isLogin(request,response, next){
    if(request.user){
        next()
    } else {
        response.send('로그인 안함')
    }
}

// 여기있는 모든 URL에 적용할 미들웨어 (특정 라우터 파일에 미들웨어를 적용하고 싶을때)
router.use('/shirts', isLogin);

router.get('/shirts', function(req, res){
    res.send('셔츠 파는 페이지입니다')
})
router.get('/pants', function(req, res){
    res.send('바지 파는 페이지입니다')
})




module.exports = router;