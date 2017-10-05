var  config      = require('./config.js')
, express        = require('express')
, app            = express()
, request        = require('request')
, mongoose       = require('mongoose')
, sessions       = require('express-session')
, MongoStore     = require('connect-mongo')(sessions)
, sessionStore   = new MongoStore(config.mongoSessionsDB)
, async          = require('async')
, E_PORT         = process.env.PORT || config.port
, debugRequests  = config.debugRequests
, errorCatch     = config.errorCatch
, _              = require('lodash')
, api            = require('./lib/helper.js')
, bodyParser     = require('body-parser')
, cookieParser   = require('cookie-parser')
, debug          = require('./lib/debug.js')
, socket         = require('./src/socket.js')
, UserActivity   = require('./src/audit.js')
, timeToLive     = 24*60*60*1000
, PermitLoad     = require('./src/permloader.js')
, QueryString = require('querystring')
, Bus = require('./src/bus.js');



mongoose.Promise = global.Promise;

api.connection = mongoose.connect(config.mongoUrl,{useMongoClient:true});


mongoose.connection.on('connected', function(){
    var ModelInit = require('./classes/InitModels.js');
    ModelInit(function(){

 /*       var Rx = require(__base+"classes/jetcalc/RegExp.js");
        var A = Rx._fromIncomplete("@KOL<<(C:STEEL)?",{ Cell: '$z10023010@KOLNORM.P56.Y2017#102_PL_ESPC_CE_ST230?',
  Row: 'z10023010',
  Col: 'KOLNORM',
  Period: '56',
  Year: '2017',
  Obj: '102_PL_ESPC_CE_ST230' });
        console.log(A);
*/
 



        var Cx = {"CodePeriod":"56","Year":"2017","CodeValuta":"RUB","IsInput":true,"IsOlap":false,"UseCache":false,"IsDebug":false,"CodeDoc":"calc_steel","CodeObj":"102","ChildObj":"102_PL_ESPC_CE_ST230","CodeGrp":"ALLORG","GroupType":"CodeDiv"};
        var Unm = require(__base+"classes/jetcalc/Unmap.js");
        var Unmap = new Unm();
        var Cells = ["$z10023010@KOLNORM.P56.Y2017#102_PL_ESPC_CE_ST230?"];
        Unmap.Unmap(Cells,Cx,function(err){
            console.log(Unmap.HowToCalculate);
            console.log(Unmap.Err.Errors);

        })


/*
        var Cx = {CodeUser:"kda","CodePeriod":"56","Year":"2017","CodeValuta":"RUB","IsInput":true,"IsOlap":false,"UseCache":true,"IsDebug":false,"CodeDoc":"balmet","CodeObj":"102","ChildObj":null,"CodeGrp":"ALLORG","GroupType":"CodeDiv"};
        var AF = require(__base+"classes/jetcalc/Helpers/AutoFill.js");
        AF.Update(Cx,function(err,Answ){
            console.log(Answ);
        })


        /*
        var Cx = {"CodePeriod":"56","Year":"2017","CodeValuta":"RUB","IsInput":true,"IsOlap":false,"UseCache":true,"IsDebug":false,"CodeDoc":"normsir","CodeObj":"102","ChildObj":"102_ST_G230_S20","CodeGrp":"ALLORG","GroupType":"CodeDiv"};
        var CApi = require(__base+"classes/jetcalc/CalcApi.js");
        CApi.CalculateDocument(Cx,function(err,Res){
            console.log(Res);

        })

      
  
*/

        app.set('port',E_PORT);
        var CookieConfig = config.cookieConfig;
        CookieConfig.store = sessionStore;

        app.use(cookieParser(config.sessionSecret));
        app.use(sessions(CookieConfig));

        // Модуль авторизации
        var passport = require('./src/passport.js');
        app.use(passport.initialize());
        app.use(passport.session());
        passport.Events.on('localauth',function(data){
            console.log("auth_event",data);
        })
        // Связь с расчетчиками
        var RabbitManager = require('./src/rabbitmq.js');
        RabbitManager.init();
         
        app.use(bodyParser.json({limit: '500mb',parameterLimit: 10000}));
        app.use(bodyParser.urlencoded({extended: true,limit: '500mb',parameterLimit: 10000}));
        


        app.use(function(req, res, next) {
            var User = mongoose.model('user');
            UserActivity.Log(req);
            if (req.session.passport && req.session.passport.user && req.user){
                var toSet = [];
                function setPermissions(callback){
                    if(req.session.permissions){
                       return callback(); 
                    }
                    var P = new PermitLoad(req.user.CodeUser);
                    P.Load(function(err,Perms){
                        req.session.permissions = Perms;
                        req.session.save(function(err){
                            if (err) console.log("Failed to save permissions to session");
                            callback(err);                            
                        });
                    })
                }
                function setSandBox(callback){
                    if (!req.session.sandbox) {
                      req.session.sandbox = {CodeUser:req.user.CodeUser,On:false};
                       callback();
                    } else {
                      if (req.session.sandbox.ToSave===0){
                        req.session.sandbox.On = false;
                      }
                      callback();
                    }
                }
                toSet.push(setPermissions);
                toSet.push(setSandBox);
                async.parallel(toSet,function(err){
                    next(err);
                });
            } else {
                req.user = null;
                next();
            }
        });


        var GFS = require(__base+'/src/gfs.js');
        app.use(GFS.router);


        var CalcApi = require(__base+'classes/calculator/CalculatorApi.js');
        app.use(CalcApi.router);


        var plugins = require(__base+'/src/plugins.js');
        
        plugins.Router(function(err,ModulesRouter){
            app.use(ModulesRouter);
            app.use(function (err, req, res, next) {
                if (_.isObject(err) && err.Module){
                    return res.redirect("/error?"+QueryString.stringify(err));
                }
                return res.json({err:err+''});
            });            
        })
        

        var environment = process.env.NODE_ENV || "development";
        var options = {};
        var server = null;


        var http = require("http");
        server = http.createServer(app);


        server.on('clientError', function(err) {
            console.log('CLIENT ERROR', err);
        });

        debug.debugRecord();

        //app.use(git.router);

        if (errorCatch) process.on('uncaughtException', function (err,info) {  console.log(err,info); });
        if (debugRequests)  console.log("Starting " + environment + " server on "+E_PORT);
        api.sessionStore = sessionStore;

        socket.init(CookieConfig, server);

        if (server) server.listen(E_PORT);
   
           


    });
})

