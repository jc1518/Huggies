// Auto scaling group module

module.exports = function(awsProfile, awsRegion){

  var AWS = require('aws-sdk');
  AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: awsProfile});
  AWS.config.region = awsRegion;

  var ASG = new AWS.AutoScaling();
  var awsASG = {};

  awsASG.showLC = function(lc, callback){
		var params = {
	  	LaunchConfigurationNames: [lc]
		};
		ASG.describeLaunchConfigurations(params, function(err, data) {
			if (err){
		  	console.log(err);
		  	callback(err);
		  } 
		  else{
		  	//console.log(data);
		  	callback(null, data);
		  }   
		});
  }

  awsASG.showallLC = function(callback){
  	var params = {};
		ASG.describeLaunchConfigurations(params, function(err, data) {
			if (err){
		  	console.log(err);
		  	callback(err);
		  } 
		  else{
		  	//console.log(data);
		  	callback(null, data);
		  }   
		});
  }

  awsASG.createLC = function(params, callback){
  	ASG.createLaunchConfiguration(params, function(err, data){
			if (err){
		  	console.log(err);
		  	callback(err);
		  } 
		  else{
		  	//console.log(data);
		  	callback(null, data);
		  }    		
  	});
  }

  awsASG.deleteLC = function(lc, callback){
		var params = {
	  	LaunchConfigurationName: lc
		};
		ASG.deleteLaunchConfiguration(params, function(err, data) {
			if (err){
		  	console.log(err);
		  	callback(err);
		  } 
		  else{
		  	//console.log(data);
		  	callback(null, data);
		  }   
		});
  }

  awsASG.showASG = function(asg, callback){
		var params = {
	  	AutoScalingGroupNames: [asg]
		};
		ASG.describeAutoScalingGroups(params, function(err, data) {
			if (err){
		  	console.log(err);
		  	callback(err);
		  } 
		  else{
		  	//console.log(data);
		  	callback(null, data);
		  }   
		});
  }  

  awsASG.showallASG = function(callback){
		var params = {};
		ASG.describeAutoScalingGroups(params, function(err, data) {
			if (err){
		  	console.log(err);
		  	callback(err);
		  } 
		  else{
		  	//console.log(data);
		  	callback(null, data.AutoScalingGroups);
		  }   
		});
  } 

  awsASG.updateASGLc = function(asg, lc, callback){
  	var params = {
		  AutoScalingGroupName: asg, 
		  LaunchConfigurationName: lc
		 };
		ASG.updateAutoScalingGroup(params, function(err, data) {
			if (err){
		  	console.log(err);
		  	callback(err);
		  } 
		  else{
		  	//console.log(data);
		  	callback(null, data);
		  }   
		});
	}

 awsASG.updateASGSize= function(asg, min, max, callback){
  	var params = {
		  AutoScalingGroupName: asg, 
		  MinSize: min,
		  MaxSize: max
		 };
		ASG.updateAutoScalingGroup(params, function(err, data) {
			if (err){
		  	console.log(err);
		  	callback(err);
		  } 
		  else{
		  	//console.log(data);
		  	callback(null, data);
		  }   
		});
	}

  awsASG.showASGLog = function(asg, callback){
		var params = {
	  	AutoScalingGroupName: asg
		};
		ASG.describeScalingActivities(params, function(err, data) {
			if (err){
		  	console.log(err);
		  	callback(err);
		  } 
		  else{
		  	//console.log(data);
		  	callback(null, data);
		  }   
		});
  }

	return awsASG;

}
