var crypto = require('crypto');

// These two lines are required to initialize Express in Cloud Code.
var express = require('express');
var app = express();

//school channel encrypt/decrypt algorithem.
//used in encrypt() and decrypt().
var algorithm = 'aes-256-ctr';

var PasswordItem = Parse.Object.extend("PasswordItem");
var SchoolChannelsItem = Parse.Object.extend("SchoolChannelsItem");
var Statistics = Parse.Object.extend("Statistics");
var Contacts = Parse.Object.extend("Contacts");
var MessagesLog = Parse.Object.extend("messagesLog");

//statistics
var number_of_clicks = 0;
var number_of_sent = 0;
var number_of_installs = 0;
var MAX_MESSAGES_TO_SAVE = 5;

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(express.bodyParser());    // Middleware for reading request body

app.use(express.basicAuth('demo', 'demo1234'));

function renderAll(req, res, message, clicked_messages, installations, messages_sent){
	console.log('renderAll() started');
    res.render('demo_messaging', { message: message, clicked_messages: clicked_messages, installations: installations, sent_messages: messages_sent});
}

function renderChangePassword(req, res, message){
    console.log('renderChangePassword() started');
    res.render('demo_change_password', { message: message});
}

app.get('/demo_messaging', function(req, res) {
	//setSchoolChannel();
    //setPassword('1111', 'demo');
    getNumberOfClicks().then(function(clicks) {
    getNumberOfInstallations().then(function(inst) {
    getNumberOfSent().then(function(sent) {
		renderAll(req, res, "", clicks, inst, sent);
	});
    });
    });
});

app.get('/demo_change_password', function(req, res) {
    //setSchoolChannel();
    //getPassword("hareutKarmiel").then(function(result) {
    res.render('demo_change_password', { message: "", url: "", channel: "", password: "", passwordMessage: "" });
    //});
});

/*function logout(req){
    req.logout();
    res.redirect('https://sites.google.com/a/hareut.tzafonet.org.il/home/');
}*/

Parse.Cloud.define("getClasses", function(request, response) {
    var query = new Parse.Query(SchoolChannelsItem);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            console.log('getClasses() successfully found ' +results.length +' data items');
            if (results.length > 0){
                var jsonObject;
                jsonObject = {
                    "answer": results[0].get(request.params.school +'_classes'),
                    "error": ""
                };
                response.success(jsonObject);
                console.log('getClasses() got classes: ' +results[0].get(request.params.school +'_classes'));
            }else{
                jsonObject = {
                    "answer": "",
                    "error": "no school data found"
                };
                response.error(jsonObject);
                console.log('getClasses() got empty data');
            }
        },
        error: function(error) {
            jsonObject = {
                "answer": null,
                "error": error.message
            };
            response.error(jsonObject);
            console.log('getClasses() error searching for data ' +error.message);
        }
    });
});

Parse.Cloud.define("getMessages", function(request, response) {
	console.log('getMessages started');
    var query = new Parse.Query(MessagesLog);
	query.equalTo('classes', request.params.className);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            console.log('getMessages() successfully found ' +results.length +' data items');
            if (results.length > 0){
				response.success(results);
                console.log('getMessages() got classes: ' +results[0].get(request.params.school +'_classes'));
            }else{
                response.error(null);
                console.log('getMessages() got empty data');
            }
        },
        error: function(error) {
            jsonObject = {
                "answer": null,
                "error": error.message
            };
            response.error(jsonObject);
            console.log('getMessages() error searching for data ' +error.message);
        }
    });
});

Parse.Cloud.define("getContacts", function(request, response) {
    var query = new Parse.Query(Contacts);
	query.equalTo('classes', request.params.className);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            console.log('getContacts() successfully found ' +results.length +' data items');
            if (results.length > 0){
                response.success(results);
                console.log('getContacts() got contacts: ' +results);
            }else{
                response.error(null);
                console.log('getContacts() got empty data');
            }
        },
        error: function(error) {
            jsonObject = {
                "answer": null,
                "error": error.message
            };
            response.error(jsonObject);
            console.log('getContacts() error searching for data ' +error.message);
        }
    });
});

Parse.Cloud.define("logIn", function(request, response) {
	console.log('login() started');
	 getPassword(request.params.school).then(function(result) {
		console.log('login() existing password is: ' +request.params.password);
		console.log('login() existing salt is: ' +result.salt);
		var hashed = crypto.pbkdf2Sync(request.params.password, result.salt, 1000, 512, 'sha512');
		console.log('login() user password is: ' +hashed.toString('hex'));
		if (result.password == hashed.toString('hex')){
			getSchoolChannel(request.params.school, request.params.password, response);
		}else{
			var jsonObject;
			jsonObject = {
				"channel": "",
				"error": "wrong password"
			};
			response.success(jsonObject);
		}		
	});
});

Parse.Cloud.define("reportSiteClick", function(request, response) {
    console.log('reportSiteClick() started');
    var query = new Parse.Query(SchoolChannelsItem);
});

app.post('/demo_messaging', function(req, res) {
	console.log('post() got school: ' +req.body.school);
   /* if (req.body.logout){
        logout(req);
    }else*/ //else {
    getNumberOfClicks().then(function(result) {
    getNumberOfInstallations().then(function(result) {
    getNumberOfSent().then(function(sent) {
        var message = "";
        getChannel(req.body.school).then(function(schoolChannel) {
            console.log('post() got school channel: ' +schoolChannel);

                if (typeof req.body.chk_group == "string") {
                        console.log('post() sending push to ' + schoolChannel +'-_-' +req.body.chk_group);
                        Parse.Push.send({
                            //where: querySchool,
                            channels: [schoolChannel +'-_-' +req.body.chk_group],
                            data: {
                                alert: req.body.message,
                                uri: req.body.url,
								//"content-available": "1",	//for ios
								className: []
                            }
							
                        }, {
                            success: function () {
                                console.log("Push was successful");
								saveMessage(req);
                                incrementSent().then(function() {
                                    renderAll(req, res, "ההודעה נשלחה בהצלחה", number_of_clicks, number_of_installs, number_of_sent);
                                });
                            },
                            error: function (error) {
                                console.error(error);
                                renderAll(req, res, "ארעה שגיאה בזמן שליחת ההודעה\n" +error, number_of_clicks, number_of_installs, number_of_sent);
                            }
                        });

                }else if (req.body.chk_group){
                    console.log('post() channel: ' + schoolChannel);
                    console.log('post() classes: ' + req.body.chk_group);

                    console.log('post() classes length is ' + req.body.chk_group.length);
                    var channelsToSend = [];
                    for (i = 0; i < req.body.chk_group.length; i++) {
                        console.log('post() adding to channels ' + schoolChannel + '-_-' +req.body.chk_group[i]);
                        channelsToSend.push(schoolChannel + '-_-' +req.body.chk_group[i]);
                    }

                        console.log('post() sending push to ' + channelsToSend);
                        Parse.Push.send({
                            //where: querySchool,
                            channels: channelsToSend,
                            data: {
                                alert: req.body.message,
                                uri: req.body.url,
								className: []
                            }
                        }, {
                            success: function () {
                                console.log("Push was successful");
								saveMessage(req);
                                incrementSent().then(function() {
                                    renderAll(req, res, "ההודעה נשלחה בהצלחה", number_of_clicks, number_of_installs, number_of_sent);
                                });
                            },
                            error: function (error) {
                                console.error(error);
                                renderAll(req, res, "ארעה שגיאה בזמן שליחת ההודעה\n" +error, number_of_clicks, number_of_installs, number_of_sent);
                            }
                        });


                }else{
                    renderAll(req, res, "ארעה שגיאה בזמן שליחת ההודעה\nNo classes", number_of_clicks, number_of_installs, number_of_sent);
                }
        });
    });
    });
    });
    //}
});

app.post('/demo_change_password', function(req, res) {
    if (req.body.changePassword){
        console.log('post() changing password');
        console.log('post() got current password: ' +req.body.password);
        console.log('post() got new password: ' +req.body.newPassword);
        getPassword(req.body.school).then(function(result) {
            var hashed = crypto.pbkdf2Sync(req.body.password, result.salt, 1000, 512, 'sha512');
            if (result.password == hashed.toString('hex')){
                console.log('post() passwords match. changing password to ' +req.body.newPassword);
                setPassword(req.body.newPassword, req.body.school).then(function(result) {
                    console.log('post() passwords changed');
                    clearChannels().then(function(result) {
                        var query = new Parse.Query(Parse.Installation); 
                        //send a notification to everyone that the password has been changed
                        Parse.Push.send({
                            where: query,
                            data: {
                                alert: "הסיסמה לשירות שונתה",
                                uri: "מעתה לא ניתן יהיה לקבל הודעות חדשות עד להתחברות בעזרת הסיסמה החדשה!"
                            }
                        }, {
                            success: function () {
                                console.log("New password push was successful");
                            },
                            error: function (error) {
                                console.error(error);
                            }
                        });
                        renderChangePassword(req, res, "הסיסמה שונתה בהצלחה");
                    });
                });
            }else{
                console.log('post() passwords don\'t match!');
                renderChangePassword(req, res, "הסיסמה שגויה!");
            }
        });
    }
});

function saveMessage(req){

	var messagesLog = Parse.Object.extend("messagesLog");
	var message = new MessagesLog();
								
	message.set("message", req.body.message);
	message.set("uri", req.body.url);
	if (typeof req.body.chk_group == "string") {
		message.set("classes", [req.body.chk_group]);
	}else{
		message.set("classes", req.body.chk_group);
	}
								
	message.save(null, {
		success: function(gameScore) {
			console.log("message saved successfully");
		},
		error: function(gameScore, error) {
			console.log("message not saved!");
		}
	});

	var query = new Parse.Query(messagesLog);
	query.descending('createdAt');
    query.find({
        success: function(results) {
            console.log('saveMessage() successfully found ' +results.length +' data items');
            if (results.length > 20){
				console.log('saveMessage() here. ' +results);
				console.log('saveMessage() the last object is ' +results[results.length - 1].message);
				results[results.length - 1].destroy({ 
					success: function(myObject) {
						console.log('saveMessage() message deleted');
					},
					error: function(myObject, error) {
						console.log('saveMessage() error deleting message. ' +error);
					}});
				console.log('saveMessage() found more than max messages, deleting last message');
            }else{
                console.log('saveMessage() got empty data');
            }
        },
        error: function(error) {
            console.log('saveMessage() error searching for data ' +error.message);
        }
    });

}

function clearChannels(){
    console.log('clearChannels() started');
    Parse.Cloud.useMasterKey();
    var promise = new Parse.Promise();
    var correction = 0;
    var query = new Parse.Query(Parse.Installation);
    query.find({
        success: function(results) {
            console.log('clearChannels() successfully found ' +results.length +' data items');
            for (i = 0; i < results.length; i++) {
                results[i].set('channels', []);
                results[i].save(null, {
                    success: function() {
                        console.log('clearChannels() cleared channels of one user');
                    },
                    error: function(gameScore, error) {
                        console.log('clearChannels() failed to cleare channels of one user');
                    }
                });
            }
            promise.resolve();

        },
        error: function(error) {
            promise.resolve(error);
            console.log('clearChannels() error searching for data ' +error.message);
        }
    });
    return promise;
}

function incrementSent(){
    console.log('incrementSent() started');
    var promise = new Parse.Promise();
    var query = new Parse.Query(Statistics);
    query.find({
        success: function(results) {
            console.log('incrementSent() successfully found ' +results.length +' data items');
            if (results.length > 0){
                results[0].increment('messages_sent');
                results[0].save(null, {
                    success: function(gameScore) {
                        console.log('incrementSent() incremented by 1');
                        number_of_sent = number_of_sent + 1;
                        promise.resolve();
                    },
                    error: function(gameScore, error) {
                        console.log('incrementSent() error incrementing sent messages');
                        promise.resolve();
                    }
                });

            }else{
                console.log('incrementSent() got empty data');
                promise.resolve();
            }
        },
        error: function(error) {
            console.log('incrementSent() error searching for data ' +error.message);
            promise.resolve();
        }
    });
    return promise;
}

function getNumberOfSent(){
    console.log('getNumberOfSent() started');
    var promise = new Parse.Promise();
    var query = new Parse.Query(Statistics);
    query.find({
        success: function(results) {
            console.log('getNumberOfSent() successfully found ' +results.length +' data items');
            if (results.length > 0){
                promise.resolve(results[0].get('messages_sent'));
                number_of_sent = results[0].get('messages_sent');
                console.log('getNumberOfSent() got number of sent: ' +results[0].get('messages_sent'));
            }else{
                promise.resolve(0);
                console.log('getNumberOfSent() got empty data');
            }
        },
        error: function(error) {
            promise.resolve(error);
            console.log('getNumberOfSent() error searching for data ' +error.message);
        }
    });
    return promise;
}

function getNumberOfInstallations(){
    console.log('getNumberOfInstallations() started');
    Parse.Cloud.useMasterKey();
    var promise = new Parse.Promise();
    var correction = 0;
    var query = new Parse.Query(Parse.Installation);
    query.find({
        success: function(results) {
            console.log('getNumberOfInstallations() successfully found ' +results.length +' data items');
            //if (results.length > 0){
            promise.resolve(results.length - correction);
            number_of_installs = results.length - correction;
            console.log('getNumberOfInstallations() got installations: ' +(results.length - correction));
            /*}else{
                promise.resolve(0);
                console.log('getNumberOfInstallations() got empty data');
            }*/
        },
        error: function(error) {
            promise.resolve(error);
            console.log('getNumberOfInstallations() error searching for data ' +error.message);
        }
    });
    return promise;
}

function getNumberOfClicks(){
    console.log('getNumberOfClicks() started');
    var promise = new Parse.Promise();
    var query = new Parse.Query(Statistics);
    query.find({
        success: function(results) {
            console.log('getNumberOfClicks() successfully found ' +results.length +' data items');
            if (results.length > 0){
                promise.resolve(results[0].get('message_clicks'));
                number_of_clicks = results[0].get('message_clicks');
                console.log('getNumberOfClicks() got clicks: ' +results[0].get('message_clicks'));
            }else{
                promise.resolve(0);
                console.log('getNumberOfClicks() got empty data');
            }
        },
        error: function(error) {
            promise.resolve(error);
            console.log('getNumberOfClicks() error searching for data ' +error.message);
        }
    });
    return promise;
}

function getClasses2(school){
    console.log('getClasses2() started');
    var promise = new Parse.Promise();
    var school = school;
    var query = new Parse.Query(SchoolChannelsItem);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            console.log('getClasses2() successfully found ' +results.length +' data items');
            if (results.length > 0){
                promise.resolve(results[0].get(school +'_classes'));
                console.log('getClasses2() got classes: ' +results[0].get(school +'_classes'));
            }else{
                promise.resolve("");
                console.log('getClasses2() got empty data');
            }
        },
        error: function(error) {
            promise.resolve(error);
            console.log('getClasses2() error searching for data ' +error.message);
        }
    });
}

function setSchoolChannel(){
    Parse.Cloud.useMasterKey();
	var channel = "demo";
    console.log('setSchoolChannel() started with channel ' +channel);
	var school = 'demo';
	var encrypted = encrypt(channel);
	var query = new Parse.Query(SchoolChannelsItem);
	query.descending('createdAt');
	
    query.find({
        success: function(results) {
            if (results.length > 0) {
                console.log('setSchoolChannel() found existing channel ' +results[0].get(school)+'. replacing it with ' +encrypted);
                results[0].set(school, channel);
                results[0].save(null, {
                    success: function(results) {
                        console.log("Save ok");
						promise.resolve(encrypted);
                     },
                    error: function(results, error) {
                        console.log("Save error");
						promise.reject(error);
                    }
                });
            }else{
                console.log('setSchoolChannel() no existing channels. creating new channel: ' +encrypted);
                var schoolChannelsItem = new SchoolChannelsItem();
				
                schoolChannelsItem.set(school, encrypted);
                passwordItem.save(null, {
                    success: function(results) {
                        console.log("Save ok");
						promise.resolve(encrypted);
                    },
                    error: function(results, error) {
                        console.log("Save error");
						promise.reject(error);
                    }
                });
            }
        },
        error: function(error) {
            console.log('setSchoolChannel() error searching for channels ' +error.message);
			promise.reject(error);
        }
    });
}

function encrypt(text){
  var cipher = crypto.createCipher(algorithm, '1234');
  var crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}
 
function decrypt(text, password){
  var decipher = crypto.createDecipher(algorithm, password)
  var dec = decipher.update(text, 'hex', 'utf8')
  dec += decipher.final('utf8');
  return dec;
}

function getSchoolChannel(school, password, callback){
    console.log('getSchoolChannel() started');
    var school = school;
    var query = new Parse.Query(SchoolChannelsItem);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            console.log('getSchoolChannel() successfully found ' +results.length +' data items');
            if (results.length > 0){
                var jsonObject;
                jsonObject = {
                    "channel": /*decrypt(*/results[0].get(school)/*, password)*/,
                    "error": ""
                };
                callback.success(jsonObject);
                console.log('getSchoolChannel() got channel: ' +/*decrypt(*/results[0].get(school)/*, password)*/);
            }else{
                jsonObject = {
                    "channel": "",
                    "error": "no school data found"
                };
                callback.error(jsonObject);
                console.log('getSchoolChannel() got empty data');
            }
        },
        error: function(error) {
            jsonObject = {
                "channel": null,
                "error": error.message
            };
            callback.error(jsonObject);
            console.log('getSchoolChannel() error searching for data ' +error.message);
        }
    });
    console.log('getSchoolChannel() ended');
}

function getChannel(school){
    console.log('getChannel() started for ' +school);
    Parse.Cloud.useMasterKey();
    var promise = new Parse.Promise();
    var Channels = Parse.Object.extend("Channels");
    var query = new Parse.Query(Channels);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            console.log('getChannel() successfully found ' +results.length +' data items for school: ' +school);
            if (results.length > 0){
			    console.log('getChannel() got channel: ' +results[0].get(school));
                promise.resolve(results[0].get(school));
            }else{
				console.log('getChannel() got empty data');
                promise.resolve("");
            }
        },
        error: function(error) {
			console.log('getChannel() error searching for data ' +error.message);
            promise.resolve(error);
        }
    });
    return promise;
}

function getPassword(school){
    console.log('getPassword() started');
	var promise = new Parse.Promise();
	var pass = "";
	var salt = "";
    var school = school;
    var query = new Parse.Query(PasswordItem);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            console.log('getPassword() successfully found ' +results.length +' passwords');
            if (results.length > 0){
				pass = results[0].get(school +'_password');
				salt = results[0].get(school +'_salt');
                if (pass) console.log('getPassword() got password');
				if (salt) console.log('getPassword() got salt');
				promise.resolve({password: pass, salt: salt});
            }else{
				promise.resolve({password: "", salt: ""});
                console.log('getPassword() got empty password');
            }
        },
        error: function(error) {
            console.log('getPassword() error searching for passwords ' +error.message);
			promise.reject("error");
        }
    });
    console.log('getPassword() ended');
	return promise;
}

function setPassword(password, school){
    console.log('setPassword() started with input ' +password);
    var school = school;
	var promise = new Parse.Promise();
	
	var salt = crypto.randomBytes(512);
	var key = crypto.pbkdf2Sync(password, salt.toString('hex'), 1000, 512, 'sha512');
	console.log('setPassword() key is: ' +key.toString('hex'));
	console.log('setPassword() salt is: ' +salt.toString('hex'));

    Parse.Cloud.useMasterKey();
    var query = new Parse.Query(PasswordItem);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            if (results.length > 0) {
                //if (results[0].get(school) != password) {
                    console.log('setPassword() found existing password ' +results[0].get(school +'_password')+'. replacing it with ' +key.toString('hex'));
                    results[0].set(school +'_password', key.toString('hex'));
					results[0].set(school +'_salt', salt.toString('hex'));
                    results[0].save(null, {
                        success: function(results) {
                            console.log("Save ok");
							promise.resolve(key.toString('hex'));
                        },
                        error: function(results, error) {
                            console.log("Save error");
							promise.reject(error);
                        }
                    });
                /*}else{
                    console.log('setPassword() found existing password. existing password is the same as the new one');
					promise.resolve("new password is the same as the old one");
                }*/
            }else{
                console.log('setPassword() no existing password. creating new password: ' +password);
                var passwordItem = new PasswordItem();
				
                passwordItem.set(school +'_password', key.toString('hex'));
				passwordItem.set(school +'_salt', salt.toString('hex'));
                passwordItem.save(null, {
                    success: function(results) {
                        console.log("Save ok");
						promise.resolve(key.toString('hex'));
                    },
                    error: function(results, error) {
                        console.log("Save error");
						promise.reject(error);
                    }
                });
            }
        },
        error: function(error) {
            console.log('setPassword() error searching for passwords ' +error.message);
			promise.reject(error);
        }
    });
	return promise;
}

// Attach the Express app to Cloud Code.
app.listen();
