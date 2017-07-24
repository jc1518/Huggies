// Spot instance reques monitor

// Default aws profile and region
var awsProfile = process.env.AWS_PROFILE;
var awsRegion = process.env.AWS_REGION;
var huggiesPassword = process.env.HUGGIES_PASSWORD;

// If you use more than one region or profile
//var awsUsRegion = process.env.AWS_US_REGION;

// Choose region
function chooseRegion(myEnv,callback){
	var awsEBS = require('./awsEBS')(awsProfile, awsRegion);
	var awsEC2 = require('./awsEC2')(awsProfile, awsRegion);
	var awsASG = require('./awsASG')(awsProfile, awsRegion);
	// Setup conditon to choose profile or region
	/*
	if(myEnv.indexOf('-us-') > -1 || myEnv.indexOf('us-sit') > -1 || myEnv.indexOf('us-prod') > -1){
		var awsEBS = require('./awsEBS')(awsProfile, awsUsRegion);
		var awsEC2 = require('./awsEC2')(awsProfile, awsUsRegion);
		var awsASG = require('./awsASG')(awsProfile, awsUsRegion);
	}*/
	var awsServices = {};
	awsServices.EBS = awsEBS;
	awsServices.EC2 = awsEC2;
	awsServices.ASG = awsASG;
	callback(awsServices);
}

function monitorSpotASG(myEnv){
	chooseRegion(myEnv,function(awsServices){
		var awsASG = awsServices.ASG;
		awsASG.showallASG(function(err, data){
			if(err){
				console.log(err);
			}
			else{
				if(data.length < 1) {
					console.log("There is no autoscaling group.");
				}
				else{
					for(var i = 0; i < data.length; i++){
						var spotASG = {};
						spotASG.asgname = data[i].AutoScalingGroupName;
						spotASG.lcname = data[i].LaunchConfigurationName;
						spotASG.dtarget = data[i].DesiredCapacity;
						spotASG.inumber = data[i].Instances.length; 
						if(spotASG['lcname'].indexOf('SPOT') > -1){
							if(spotASG['dtarget'] > spotASG['inumber']){
								console.log(spotASG['lcname'].split('+')[1] + ' has outstanding instances. Looking into it...');
								manageSpot(myEnv, spotASG['lcname']);
							}
							else {
								console.log(spotASG['lcname'].split('+')[1] + ' has no outstanding instances.');
							}
						}
					}
				}
			}
		});
	});	
}

function findAsgSirId(myEnv, asg, callback){
	chooseRegion(myEnv,function(awsServices){
		var awsASG = awsServices.ASG;
		awsASG.showASGLog(asg, function(err, data){
			if(err || data.Activities.length == 0){
				callback(false);
			}
			else {
				var sirIDs = [];
				var j = 5;
				if (data.Activities.length < j) {
					j = data.Activities.length;
				}
				for (var i = 0; i < j; i++) {
					if(data.Activities[i].Description.indexOf('Placed Spot instance request') > -1) {
						var sirID = data.Activities[i].Description.split(' ')[11].split('.')[0]
						sirIDs.push(sirID);
						callback(null, sirIDs);
					}
				}
				if(sirIDs.length == 0){
					callback(false)
				}
			}
		});
	});
}

function findSirStatus(myEnv, asg, callback){
	chooseRegion(myEnv,function(awsServices){
		var awsEC2 = awsServices.EC2;
		findAsgSirId(myEnv, asg, function(err, data){
			if(err || data == false || typeof(data) == 'undefined'){
				if(err){
					console.log(err);
				}
				callback(false);	
			}
			else {
				awsEC2.describeSpotRequests(data, function(err1, data1){
					if(err1){
						console.log(err1);
						callback(false);
					}
					else{
						var sirStatus = data1[0]['Status']['Message'];
						// If bid price is too low
						if(data1[0]['Status']['Code'] == 'price-too-low') {
							var minPrice = parseFloat(sirStatus.split(' ')[17].slice(0, -1));
							var newbidPrice = (minPrice + 0.0001);
							console.log(data[0] + ': ' + sirStatus + " Huggies suggests new bid price " + newbidPrice);
							callback(null, newbidPrice);
						}
						// This function can be extended to support other status here
						else {
							console.log(data[0] + sirStatus );
							callback(false);
						}
					}
				}); 
			}
		});
	});
}

function manageSpot(myEnv, lc){
	var spot = {};
	spot.env = lc.split('+')[1];
	spot.instance = lc.split('-')[1];
	spot.bid = lc.split('+')[0].split('$')[1];
	chooseRegion(myEnv,function(awsServices){
		var awsEBS = awsServices.EBS;
		awsEBS.showEnvironmentRes(spot['env'], function(err, data){
			if(err){
	  		console.log(err);
			}
			else{
				spot.asg = data.EnvironmentResources.AutoScalingGroups[0].Name;
				findSirStatus(myEnv, spot['asg'], function(err1, data1){
					if(err1 || data1 == false || typeof(data1) == 'undefined'){
						console.log(spot['env'] + ": no action will be taken");
					}
					else{
						console.log(spot['env'] + ' ' + data1);
						spotOn(spot['env'], spot['instance'], data1)
					}
				});
			}
		});
	});
}

function spotOn(server, instance, price){
	var querystring = require('querystring');
	var http = require('http');
	var requestData = querystring.stringify({
		"username": "huggies",
		"password": huggiesPassword,
		"server": server, 
		"instance": instance,
		"price": price
	});
	var options = {
		hostname: 'localhost',
		port: '8080',
		path: '/aws/eb/spoton',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(requestData)
		}
	};
	var req = http.request(options, function(res) {
  	console.log('Status: ' + res.statusCode);
  	//console.log('Headers: ' + JSON.stringify(res.headers));
  	res.setEncoding('utf8');
  	res.on('data', function (body) {
    	console.log('Body: ' + body);
  	});
	});
	req.on('error', function(e) {
  	console.log('Error: ' + e.message);
	});
	req.write(requestData)
	req.end();
}

// Main
monitorSpotASG('syd');

