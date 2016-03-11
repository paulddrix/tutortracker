"use strict";
module.exports = function(app) {
  const
  moment = require('moment'),
  jwt = require('jsonwebtoken'),
  fs = require('fs'),
  //models
  userAccount = require('../models/account'),
  courses = require('../models/courses'),
  tutorRequests = require('../models/tutorRequests'),
  officeHours = require('../models/officeHours');
  //keys
  //public key
  const puCert = fs.readFileSync('./keys/public.pub');
  //Private Key
  const prCert = fs.readFileSync('./keys/private.pem');



  /*
  LANDING PAGE
  */
  app.get('/', function(req, res){
    //the root route is going to redirect to  the dashboard.
    //check if the user has the auth cookie.
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    //if they do, decode it.
    else{
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          res.redirect('/dashboard');

        };
      });
    }
  });
  /*
  LOGIN
  */
  app.get('/login',function(req,res){
    res.render('login');
  });
  //Verify credentials
  app.post('/verify',function(req,res){
    console.log('req.body',req.body);
    if(!req.body){
      res.sendStatus(400);
    }
    else{
      //read from DB to see what type of account they have
      userAccount.getUser(req.body,function(result){
        console.log('results from query',result);
        if(result[0]=== undefined){
          res.redirect('/login');
        }
        else{

          var token = jwt.sign({ alg: 'RS256',typ:'JWT',admin:result[0].admin, userId:result[0].userId }, prCert, { algorithm: 'RS256',issuer:'system',expiresIn:86400000});
          res.cookie('auth', token, {expires: new Date(Date.now() + 9000000),maxAge: 9000000 });//secure: true
          res.redirect('/');
        }
      });
    }
  });
  /*
  DASHBOARD
  */
  app.get('/dashboard',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in DASHBOARD Route',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        //if the user is an admin
        else if(decoded['iss'] === "system" && decoded['admin'] === true){
          var data = {userData:{admin:true},loggedIn:true};
          userAccount.getUsers({admin:false},function(results) {
            data['tutorList']=results;
            courses.getCourses({},function(courseRes) {
              data['courseList']=courseRes;
              tutorRequests.getTutorRequests({rejected:true},function(rejectedDocs){
                data['rejectedDocs'] = rejectedDocs;
                res.render('dashboard',data);
              });
            });
          });
        }
        //if the user is a tutor
        else{
          userAccount.getUser({userId:decoded.userId},function(result){
            var data = {userData:result[0],loggedIn:true};
            res.render('dashboard',data);
          });
        }
      });
    }
  });
  /*
  DASHBOARD > SEARCH TUTOR ELIGIBILITY
  */
  app.get('/tutoreligibility/:coursename',function(req,res){
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in DASHBOARD Route',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        //if the user is an admin
        else if(decoded['iss'] === "system" && decoded['admin'] === true){
          userAccount.getUsers({"eligibleCourses.courseName": req.params.coursename},function(doc) {
            res.send(doc);
          });
        }
        //if the user is a tutor
        else{
          res.redirect('/login');
        }
      });
    }
  });
  /*
  DASHBOARD > ADD TUTOR REQUEST HANDLER
  */
  app.post('/addtutorrequesthandler', function(req,res) {
    console.log('req body',req.body);
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt at addtutorrequesthandler',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          let assignedTutor = parseInt(req.body.assignTutor);
          let requestId = Math.floor((Math.random() * 99999999) + 10000000);
          let dateAdded = moment().format("dddd, MMMM Do YYYY, h:mm a");
          let newTutorRequest = {
            "dateAdded":dateAdded,
            "firstName": req.body.firstName,
            "lastName": req.body.lastName,
            "email": req.body.email,
            "phone": req.body.phone,
            "degree": req.body.degree,
            "courseToTutor": req.body.courseToTutor,
            "program": req.body.program,
            "assignTutor": assignedTutor,
            "requestId":requestId,
            "pendingStatus":true
          };
          tutorRequests.createRequest(newTutorRequest,function(err,result){
            console.log('error ',err);
          });
          userAccount.addToArray({userId:assignedTutor},{studentsToTutor:newTutorRequest},function(err,result){
            console.log('error',err);
          });
          res.redirect('/dashboard');
        }
      });
    }
  });
  /*
  DASHBOARD > VIEW TUTOR REQUEST
  */
  app.get('/dashboard/tutorrequest/:requestid',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in VIEW TUTOR REQUEST',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        //if the user is an admin
        else if(decoded['iss'] === "system" && decoded['admin'] === true){
          userAccount.getUser({userId:decoded['userId']},function(result){
            var data = {userData:result[0],loggedIn:true};
            var incomingRequestId = parseInt(req.params.requestid);
            tutorRequests.getTutorRequests({requestId:incomingRequestId},function(request){
              data['tutorRequest'] = request[0];

              userAccount.getUsers({admin:false},function(results) {
                data['tutorList']=results;
                courses.getCourses({},function(courseRes) {
                  data['courseList']=courseRes;
                  res.render('tutorRequestDetails',data);
                });
              });
            });
          });
        }
        else if (decoded['iss'] === "system" && decoded['admin'] === false) {
          userAccount.getUser({userId:decoded['userId']},function(result){
            var data = {userData:result[0],loggedIn:true};
            var incomingRequestId = parseInt(req.params.requestid);
            userAccount.tutorRequestDetails(decoded['userId'],incomingRequestId,function(tutorRequest){
              data['tutorRequest']=tutorRequest[0]['studentsToTutor'];
              res.render('tutorRequestDetails',data);
            });
          });
        }
      });
    }
  });
  /*
  DASHBOARD > ACCEPT TUTOR REQUEST
  */
  app.get('/tutorrequest/accept/:requestid/:assignTutor',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in VIEW TUTOR REQUEST',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        //if the user is an admin
        else if(decoded['iss'] === "system"){
          var incomingRequestId = parseInt(req.params.requestid);
          var incomingAssignTutor = parseInt(req.params.assignTutor);
          userAccount.updateArrayElement({userId:incomingAssignTutor,"studentsToTutor.requestId":incomingRequestId},
          {"studentsToTutor.$.pendingStatus":false},function(result){

            //**************************************************
            //let the admin know the tutor accepted the request.
            //**************************************************
            res.redirect('back');
          });

        }
      });
    }
  });
  /*
  DASHBOARD > DENY TUTOR REQUEST
  */
  app.post('/tutorrequest/deny',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in VIEW TUTOR REQUEST',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        //if the user is an admin
        else if(decoded['iss'] === "system"){
          var incomingRequestId = parseInt(req.body.requestId);
          var incomingAssignTutor = parseInt(req.body.assignTutor);
          var denialReason = req.body.denyReason;
          userAccount.pullFromArray({userId:incomingAssignTutor},{ studentsToTutor: { requestId: incomingRequestId } } ,function(err,result){
            console.log('error',err);
            tutorRequests.updateTutorRequest({requestId:incomingRequestId},{rejected:true,denyReason:denialReason},function(result){
              res.redirect('/dashboard');
            });
          });
        }
      });
    }
  });
  /*
  DASHBOARD > RE-ASSIGN TUTOR REQUEST HANDLER
  */
  app.get('/reassigntutor/:tutorId/:requestid', function(req,res) {
    console.log('req params',req.params);
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt at reassigntutor',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          var incomingRequestId = parseInt(req.params.requestid);
          var incomingTutorId = parseInt(req.params.tutorId);
          tutorRequests.updateTutorRequest({requestId:incomingRequestId},{rejected:false,assignTutor:incomingTutorId},function(result){
            //must query for the tutor request to add ************
            tutorRequests.getRequest({requestId:incomingRequestId},function(result){
              //hold the req and make the necessary changes to it
              var targetReq = result[0];
              targetReq['assignTutor']= incomingTutorId;
              //targetReq['rejected']= false;
              console.log('EDITTED REQ ',targetReq);

              userAccount.addToArray({userId:incomingTutorId},{studentsToTutor:targetReq},function(err,result){
                console.log('error',err);
                res.redirect('/dashboard');
              });
            });

          });
        }
      });
    }
  });
  /*
  OFFICE HOURS
  */
  app.get('/officehours',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system" && decoded['admin'] === true){

          userAccount.getUser({userId:decoded.userId},function(result){
              var data={};
            data['userData'] = result[0];
            data['loggedIn'] = true;
            //current date
            var currentDate = moment().format("MM/DD/YYYY");
            // Get the current month based on today's date
            officeHours.getCurrentMonth(currentDate,function(currentMonth){
                   //get all the shifts for this month
                   officeHours.organizedShifts(currentMonth[0].startDate,currentMonth[0].endDate,function(officeShifts){
                       //parse shifts into a month object

                       var days = [];

                       for (let i = 0; i < officeShifts.length; i++) {
                          var weekDay={};
                          weekDay['dayName']= officeShifts[i]['_id'].dayName;
                          weekDay['dayDate']= officeShifts[i]['_id'].dayDate;
                          weekDay['humanReadbleDate']= officeShifts[i]['_id'].humanReadbleDate;
                          weekDay['10AM-1PM']=[];
                           weekDay['1PM-4PM']=[];
                           for (let x = 0; x < officeShifts[i].shifts.length; x++) {

                                  if(officeShifts[i].shifts[x].shift == '10AM-1PM'){
                                          weekDay['10AM-1PM'].push(officeShifts[i].shifts[x]);
                                  }
                                  if(officeShifts[i].shifts[x].shift == '1PM-4PM'){
                                          weekDay['1PM-4PM'].push(officeShifts[i].shifts[x]);
                                  }
                           }
                           //push the weekDay into the array of days
                            days.push(weekDay);
                       }

                      data['days'] = days;
                      console.log("FUCK",data['days']);
                      res.render('officeHours',data);

                   });

            });


          });
        }

        else if(decoded['iss'] === "system" && decoded['admin'] === false){

          userAccount.getUser({userId:decoded.userId},function(result){
            var data={};
            data['userData'] = result[0];
            data['loggedIn'] = true;
            res.render('officeHours',data);

          });
        }
      });
    }
  });
  /*
  OFFICE HOURS > ACCEPT SHIFT HANDLER
  */
  app.get('/acceptshift/:userId/:shiftId',function(req,res) {
      console.log(req.params);

    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in DENY SHIFT HANDLER ',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          var tutorId = parseInt(req.params.userId);
          var officeShiftId = parseInt(req.params.shiftId);
          userAccount.updateArrayElement({userId:tutorId,"officeHours.shiftId":officeShiftId},
          {"officeHours.$.approved":true,"officeHours.$.pending":false},function(result){
            // FIXME: need to add the total of all shifts and place that in the totalShiftHours field for a tutor
            officeHours.updateOfficeHours({shiftId:officeShiftId},{"approved":true,"pending":false},function(){
              res.redirect('/officehours');
            });
          });
        }
      });
    }
  });
  /*
  OFFICE HOURS > DENY SHIFT HANDLER
  */
  app.get('/denyshift/:userId/:shiftId',function(req,res) {
      console.log(req.params);

    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in DENY SHIFT HANDLER ',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          var tutorId = parseInt(req.params.userId);
          var officeShiftId = parseInt(req.params.shiftId);
          // FIXME: add the total office hours again after the shift has been removed from the array
          userAccount.pullFromArray({userId:tutorId},{ "officeHours": { shiftId: officeShiftId } },function(result){
            officeHours.destroyShift({shiftId:officeShiftId},function(result){
              res.redirect('/officehours');
            });
          });
        }
      });
    }
  });
  /*
  OFFICE HOURS > REMOVE SHIFT HANDLER
  */
  app.get('/removeshift/:userId/:shiftId',function(req,res) {
      console.log(req.params);

    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in DENY SHIFT HANDLER ',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          var tutorId = parseInt(req.params.userId);
          var officeShiftId = parseInt(req.params.shiftId);
          userAccount.pullFromArray({userId:tutorId},{ "officeHours": { shiftId: officeShiftId } },function(result){
            officeHours.destroyShift({shiftId:officeShiftId},function(result){
              res.redirect('/officehours');
            });
          });
        }
      });
    }
  });

  /*
  OFFICE HOURS > REQUEST SHIFT
  */
  app.get('/officehours/requestshift',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:decoded.userId},function(result){
            var data = {userData:result[0],loggedIn:true};
            res.render('requestShift',data);
          });
        }
      });
    }
  });
  /*
  OFFICE HOURS > REQUEST SHIFT HANDLER
  */
  app.post('/requesthandler',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){

          var shiftDate = moment(req.body.shiftDate).format("MM/DD/YYYY");
          var shiftDateHumanFormat = moment(req.body.shiftDate).format("dddd, MMMM Do YYYY");
          var shiftDay = moment(req.body.shiftDate).format("dddd");
          var shiftId = Math.floor((Math.random() * 99999999) + 10000000);
          var newShift = {
                    "dayName" : shiftDay,
                    "shiftId":shiftId,
                    "dayDate" :shiftDate ,
                    "humanReadbleDate":shiftDateHumanFormat,
                    "shift" : req.body.shift,
                    "tutorName" : req.body.tutorName,
                    "shiftHours" : 3,
                    "userId" : parseInt(req.body.userId),
                    "pending" : true,
                    "approved" : false
           };
          officeHours.createShift(newShift,function(results){
            //send the request to the tutor's office hours array
            userAccount.addToArray({userId:parseInt(req.body.userId)},{"officeHours":newShift},function(result){
              console.log('result from addToArray ReqSHiftHandler',result);
              res.redirect('/officehours');
            });
          });

        }
      });
    }
  });
  /*
  PROFILE
  */
  app.get('/profile',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:decoded.userId},function(result){
            var data = {userData:result[0],loggedIn:true};
            res.render('profile',data);
          });
        }
      });
    }
  });
  /*
  EDIT PROFILE
  */
  app.get('/profile/editprofile',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:decoded.userId},function(result){
            console.log("edit profile page ",result[0]);
            var data = {userData:result[0],loggedIn:true};
            res.render('editProfile',data);
          });
        }
      });
    }
  });
  /*
  HANDLE EDIT PROFILE
  */
  app.post('/editprofilehandler',function(req,res) {
    var editUserId = parseInt(req.body.userId);
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in editprofilehandler',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          var editedProfile = {
            "firstName":req.body.firstName,
            "lastName":req.body.lastName,
            "email":req.body.email,
            "password":req.body.password,
            "phone":req.body.phone
          };
          userAccount.updateUser({ userId:editUserId },editedProfile,function(result){
            console.log('result from update in editprofilehandler',result);
            res.redirect('profile');
          });
        }
      });
    }
  });
  /*
  USERS
  */
  app.get('/users',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:decoded.userId},function(result){
            var data = {userData:result[0],loggedIn:true};
            userAccount.getUsers({},function(results) {
              data['users']=results;
              res.render('users',data);
            });
          });
        }
      });
    }
  });
  /*
  USERS > PROFILE
  */
  app.get('/users/userprofiles/:userId',function(req,res) {
    //making idNumber an integer
    var incomingNumber = parseInt(req.params.userId);
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:incomingNumber},function(result) {
            var data={loggedIn:true};
            data['userProfile']=result[0];
            res.render('userDetails',data);
          });
        }
      });
    }
  });
  /*
  USERS > ADD PAGE
  */
  app.get('/users/adduser',function(req,res){
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system" && decoded['admin'] == true){
          userAccount.getUser({userId:decoded.userId},function(result){
            var data = {userData:result[0],loggedIn:true};
            res.render('addUser',data);
          });
        }
      });
    }
  });
  /*
  USERS > ADD USER HANDLER
  */
  app.post('/adduserhandler',function(req,res){
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in adduserhandler',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          //check if the new user is an admin
          var userId = Math.floor((Math.random() * 99999999) + 10000000);
          var addID = parseInt(req.body.idNumber);
          var addTxt;
          if(req.body.textAlert == 'true'){
            addTxt= true;
          }
          else{
            addTxt= false;
          }
          console.log('FUCK REQ',req.body);
          var newUser = {
            "email" : req.body.email,
            "password" : req.body.password,
            "firstName" : req.body.firstName,
            "lastName":req.body.lastName,
            "phone" : req.body.phone,
            "textAlert":addTxt,
            "idNumber":addID,
            "userId":userId
          };
          if (req.body.admin == 'true') {
            newUser['admin']= true;
          }
          else{
            newUser["admin"]= false;
            newUser["monthlyTotalHours"]= 0,
            newUser["monthlyTotalShiftHours"]= 0,
            newUser["monthlyTotalSessionHours"]=0,
            newUser["studentsToTutor"]=[];
            newUser["timeSheet"]=[];
            newUser["eligibleCourses"]=[];
            newUser["officeHours"]=[];
          }
          if (req.body.degree != 'false') {
            newUser['degree']= req.body.degree;
          }
          console.log(' NEWUSER',newUser);
          userAccount.createUser(newUser,function(result, err){
            res.redirect('/users');
          });
        }
      });
    }
  });
  /*
  USERS > DELETE USER HANDLER
  */
  app.get('/users/deleteuserhandler/:userId',function(req,res){
    console.log(req.params);
    var deleteUserId = parseInt(req.params.userId);
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in deleteuserhandler',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          userAccount.destroyUser({userId:deleteUserId},function(result,err) {
            res.redirect("/users");
          });
        }
      });
    }
  });
  /*
  USERS > EDIT PAGE
  */
  app.get('/users/edituser/:userId',function(req,res){
    var editUserId= parseInt(req.params.userId);
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in edituser',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:editUserId},function(result){
            var data = {userData:result[0],loggedIn:true};
            res.render('editUser',data);
          });
        }
      });
    }
  });
  /*
  USERS > EDIT USER HANDLER
  */
  app.post('/edituserhandler',function(req,res){
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in editprofilehandler',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          var editIdNumber = parseInt(req.body.idNumber);
          var editUserId = parseInt(req.body.userId);
          var editTxt;
          var editAdmin;
          if(req.body.textAlert === 'true'){
            editTxt= true;
          }
          else{
            editTxt= false;
          }
          if(req.body.admin === 'true'){
            editAdmin= true;
          }
          else{
            editAdmin= false;
          }
          var editedUser = {
            "email" : req.body.email,
            "password" : req.body.password,
            "firstName" : req.body.firstName,
            "lastName":req.body.lastName,
            "phone" : req.body.phone,
            "admin" : editAdmin,
            "textAlert":editTxt,
            "idNumber":editIdNumber
          };
          if (req.body.degree !=false) {
            editedUser['degree']= req.body.degree;
          }
          userAccount.updateUser({ userId:editUserId},editedUser,function(result){
            res.redirect('/users');
          });
        }
      });
    }
  });
  /*
  TIME SHEET
  */
  app.get('/timesheet',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in timesheet',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:decoded.userId},function(result){
            var data = {userData:result[0],loggedIn:true};
            userAccount.getUsers({admin:false},function(results) {
              data['users']=results;
              res.render('timeSheet',data);
            });
          });
        }
      });
    }
  });
  /*
  TIME SHEET > TUTOS TIME SHEET DETAILS
  */
  app.get('/timesheet/tutortimesheetdetails/:userId',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in timesheet',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:decoded.userId},function(result){
            var data = {userData:result[0],loggedIn:true};
            var userID = parseInt(req.params.userId);
            userAccount.getUser({userId:userID},function(results) {
              data['tutor']=results[0];
              res.render('timeSheetDetails',data);
            });
          });
        }
      });
    }
  });
  /*
  TIME SHEET > ADD SESSION PAGE
  */
  app.get('/timesheet/addsession',function(req,res) {
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in timesheet',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:decoded.userId},function(result){
            var data = {userData:result[0],loggedIn:true};
            res.render('addSession',data);
          });
        }
      });
    }
  });
  /*
  TIME SHEET > ADD SESSION HANDLER
  */
  app.post('/timesheet/addsessionhandler',function(req,res){
    console.log('req body ',req.body);
    if(req.cookies.auth === undefined){
      res.redirect('/login');
    }
    else{
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt in editprofilehandler',decoded);
        if(decoded == undefined){
          res.redirect('/login');
        }
        else if(decoded['iss'] === "system"){
          var sessionUserId = parseInt(req.body.userId);
          var startTime = moment(req.body.sessionDate + " " + req.body.sessionStartTime);
          var endTime = moment(req.body.sessionDate + " " + req.body.sessionEndTime);
          var totalHours = endTime.diff(startTime,'minutes')/60;
          var sessionDate = moment(req.body.sessionDate).format("MM/DD/YYYY");
          var sessionData = {
            "sessionDate" :sessionDate ,
            "sessionStartTime" : startTime.format('h:mm A'),
            "sessionEndTime" : endTime.format('h:mm A'),
            "sessionTotal":totalHours
          };
          userAccount.addToArray({ userId:sessionUserId},{timeSheet:sessionData},function(result){
            //add the session to the timeSheet array.
            userAccount.sumStdSessions(sessionUserId,function(sumRes) {
              //sum up all the session hour totals
              console.log("SUM ",sumRes);
              console.log(sumRes[0].total);
              userAccount.updateUser({userId:sessionUserId},{monthlyTotalSessionHours:sumRes[0].total},function(result) {
                //insert the total in the tutor's monthlyTotalSessionHours.
                //FIX ME: how to make the monthlyTotalHours always add the values
                //for monthlyTotalSessionHours and monthlyTotalShiftHours
                //userAccount.updateUser({userId:sessionUserId},,function(result) {
                //add the monthlyTotalSessionHours to the tutor's monthlyTotalHours
                //console.log(result);
                res.redirect('/timesheet');
                //});
              });
            });
          });
          // do aggregate func to get the sum of all the sessions and add them tp the tutor's total.
        }
      });
    }
  });
  /*
  HELP & SUPORT
  */
  app.get('/helpSupport',function(req,res) {
    if(req.cookies.auth != undefined){
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.render('helpSupport');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:decoded.userId},function(result){
            var userInfo = {userData:result[0],loggedIn:true};
            userAccount.getUsers({},function(results) {
              userInfo['users']=results;
              res.render('helpSupport',userInfo);
            });
          });
        }
      });
    }
    else{
      res.render('helpSupport');
    }
  });
   /*
  HELP & SUPORT > FAQ
  */
  app.get('/helpSupport/faq',function(req,res) {

    if(req.cookies.auth != undefined){
      // we will check if the user requesting the page is a tutor or an admin
      // verify a token asymmetric
      jwt.verify(req.cookies.auth, puCert, function(err, decoded){
        console.log('decoded jwt',decoded);
        if(decoded == undefined){
          res.render('faq');
        }
        else if(decoded['iss'] === "system"){
          userAccount.getUser({userId:decoded.userId},function(result){
            var userInfo = {userData:result[0],loggedIn:true};
            userAccount.getUsers({},function(results) {
              userInfo['users']=results;
              res.render('faq',userInfo);
            });
          });
        }
      });
    }
    else{
      res.render('faq');
    }
  });
  /*
  LOGOUT
  */
  app.get('/logout',function(req,res){
    res.cookie('auth',"logged-out");
    res.redirect('/login');
  });
  /*
  FORGOT PASSWORD
  */
  app.get('/forgotpassword',function(req,res){
    res.render('forgotPassword');
  });
  /*
  HANDLE FORGOT PASSWORD
  */
  app.post('/forgotpasswordhanlder',function(req,res){
    res.redirect('/login');
  });

}//end export
