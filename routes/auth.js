const router = require('express').Router();
const App = require('../models/Application');
const User = require('../models/User');
//course ?
const passport = require('passport');

//argonauti@yahoo.com

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()) return res.redirect('/auth/profile');
    return next();
}

function isAuthenticated(req,res,next){
    if(!req.isAuthenticated()) return res.redirect('/auth/login');
    return next();
}

router.get('/logout', (req,res)=>{
    req.logout();
    //res.redirect('/');
    res.redirect('/auth/login?error=Cerraste sesión con éxito');
})

router.get('/login', isLoggedIn, (req,res)=>{
    res.render('auth/login', {error:req.query.error});
});

router.post('/login', passport.authenticate('local', {
    successRedirect:'/auth/profile',
    failureRedirect:'/auth/login?error=hay un error con tu email o contraseña'
}));

router.get('/profile', isAuthenticated, (req,res, next)=>{
    User.findById(req.user._id)
    .populate('app')
    .populate('selectedCourse')
    .then(user=>{
        //if(user.role === "ADMIN") return res.redirect('/admin/courses');
        if(user.role === "ADMIN") user.admin = true;
        switch(user.status){
            case('SENT'):
                user.color = "yellow"
                user.estado = "Deposito en revisión";
                break;
            case('ENROLLED'):
                user.color = "green"
                user.estado = "Inscrito";
                break;
            default:
            console.log("chet")
                user.estado = "Pendiente de deposito de apartado";
                user.status = undefined;
                break;

        }
        res.render('auth/profile', user)
    })
    .catch(e=>next(e));
    
});

router.post('/confirm/:appId', (req,res,next)=>{
    App.findById(req.params.appId)
    .then(app=>{
        if(req.body.password !== req.body.password2) {
            const error = "La contraseña no coincide"
            return res.render('auth/selectPass', {...req.params, email:app.email, error});
        }
        const newUser = {
            username: app.email,
            app: app._id,
            email: app.email
        };
        User.register(newUser, req.body.password, (err, user)=>{
            if (err) {
                if(err.name === "UserExistsError") return res.render('auth/exist');
                return res.send(err);
            }
            console.log('intento');
            req.body.username = newUser.email;
            req.body.email = newUser.email;
            passport.authenticate('local')(req, res, function () {
                console.log('logré')
                res.redirect('/auth/profile');
            });
            //next();
        });



        
    })
    .catch(e=>next(e));
});

router.get('/confirm/:appId', (req,res,next)=>{
    App.findById(req.params.appId)
    .then(app=>{
        res.render('auth/selectPass', {...req.params, email:app.email});
    })
    .catch(e=>next(e));
    
});

router.get('/confirm', (req,res,next)=>{
    res.render('auth/signup', {error:req.query.error ? "No se encontró tu correo":null});
}); //signup

router.post('/confirm', (req,res,next)=>{
    App.findOne({email:req.body.email, interview_score:{$lt:3}})
    .then(app=>{
        if(app) return res.redirect(`/auth/confirm/${app._id}?email=${app.email}`);
        res.redirect('/auth/confirm?error=true');
    })
    .catch(e=>res.redirect('/auth/confirm?error=true'));
}); //signup

module.exports = router;