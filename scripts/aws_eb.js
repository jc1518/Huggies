// Description:
// huggies for AWS Elastic Beanstalk
// Commands:
// hubot aws eb help

//////////////
//User space//
//////////////

// Default aws profile and region
var awsProfile = process.env.AWS_PROFILE;
var awsRegion = process.env.AWS_REGION;

// Add multiple profiles and regions here if you need
// The environment variables need to be added to envvars
//var awsProfile_sales = process.env.AWS_PROFILE_SALES;
//var awsRegion_west2 = process.env.AWS_REGION_WEST2;

// Slack channel for auditing
var SLACK_CHANNEL = process.env.SLACK_CHANNEL;

// To call script
var exec = require('child_process').exec;

// User group for Slack
var Users = require('../lib/slackusers');

// User group for Restful API
var WebHookUsers = require('../lib/apiusers');

// Decrpyt password
var bcrypt = require('bcrypt-nodejs');

// Pre-configured and consolidated Elastic Beanstalk Environments
var allEnvs = require('../lib/ebenvs');

// To ignore the ssl warning if any
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

///////////////
//AWS EB Core//
///////////////

module.exports = function(robot){

	////////////
	//Fuctions//
	////////////
	// help
	function sendHelp(msg){
		helpString = "Usage:\n";
		helpString += '\t`aws eb start <environment[@min:max]>` - start Elastic Beanstalk environment\n';
		helpString += '\t`aws eb stop <environment>` - stop Elastic Beanstalk environment\n';
		helpString += '\t`aws eb show <environment>` - show Elastic Beanstalk environment info\n';
		helpString += '\t`aws eb spot-on <environment> <instance_type> <bid_price>` - enable spot instance for Elastic Beanstalk environment\n';
		helpString += '\t`aws eb spot-off <environment>` - disable spot instance for Elastic Beanstalk environment\n';
		helpString += '\t`aws eb spot-show all` - show spot request status and spot instance enabled environments\n';
		helpString += '\t`aws eb autostart-<on|off|show> <environment>[@hh:mm]` - turn on/off or show autostart for Elastic Beanstalk environment\n';
		helpString += '\t`aws eb autostop-<on|off|show> <environment>[@hh:mm]` - turn on/off or show autostop for Elastic Beanstalk environment';
		msg.send("```" + helpString + "```");
	}

	// Choose region and profile
	function chooseRegion(myEnv,callback){
		var awsEBS = require('../lib/awsEBS')(awsProfile, awsRegion);
		var awsEC2 = require('../lib/awsEC2')(awsProfile, awsRegion);
		var awsASG = require('../lib/awsASG')(awsProfile, awsRegion);
		// Setup condition to use different regions or profiles
		// Best practise is to follow a consistent naming convention
		/*
		if(myEnv.indexOf('west2') > -1){
			var awsEBS = require('../lib/awsEBS')(awsProfile, awsUsRegion_west2);
			var awsEC2 = require('../lib/awsEC2')(awsProfile, awsUsRegion_west2);
			var awsASG = require('../lib/awsASG')(awsProfile, awsUsRegion_west2);
		}
		if(myEnv.indexOf('sales') > -1 && myEnv.indexOf('west2') > -1 ){
			var awsEBS = require('../lib/awsEBS')(awsProfile_sales, awsRegion_west2);
			var awsEC2 = require('../lib/awsEC2')(awsProfile_sales, awsRegion_west2);
			var awsASG = require('../lib/awsASG')(awsProfile_sales, awsRegion_west2);
		}	*/
		var awsServices = {};
		awsServices.EBS = awsEBS;
		awsServices.EC2 = awsEC2;
		awsServices.ASG = awsASG;
		return callback(awsServices);
	}

  // Check permission of Slack users
	function checkPermission(msg, users, myEnv, callback){
		var userId = msg.message.user.profile.email.toLowerCase().trim();
		if (typeof users[userId] != 'undefined' && users[userId].role.indexOf('admin') > -1 ) {
			console.log(userId + " is admin, and has access to all.");
			callback(true);
		}
		else if (typeof users[userId] != 'undefined' && users[userId].role.indexOf(myEnv) > -1 ) {
			console.log(userId + " has permission to " + myEnv);
			callback(true);
		}
		else {
			console.log(userId + " does not have permission to " + myEnv);
			callback(false);
		}
	}

	// Check permission of API users
	function WebHookcheckPermission(user, password, myEnv, callback){
		if (typeof WebHookUsers[user] != 'undefined' && bcrypt.compareSync(password, WebHookUsers[user].password) && WebHookUsers[user].role.indexOf('admin') > -1) {
			robot.messageRoom(SLACK_CHANNEL, "```" +  user + " made a successful API call to operate " + myEnv + ".```" );
			callback(true);
		}
		else if (typeof WebHookUsers[user] != 'undefined' && bcrypt.compareSync(password, WebHookUsers[user].password)) {	
			if (WebHookUsers[user].role.indexOf(myEnv) > -1) {
				robot.messageRoom(SLACK_CHANNEL, "```" +  user + " made a successful API call to operate " + myEnv + ".```" );
				callback(true);
			}
			else {
				robot.messageRoom(SLACK_CHANNEL, "`" +  user + " has no permission to make API call to operate " + myEnv + ".`" );
				callback(false);
			}
		}
		else {
			robot.messageRoom(SLACK_CHANNEL, "`" +  user + " gets denied when making API call to operate " + myEnv + ".`" );
			callback(false);
		}
	}

	// If you want to exclude some environment from Huggies
	// for examle, any environment with -prod in the name
	function isProd(myEnv,callback){
		if(myEnv.indexOf('-prod') > -1){
			callback(true);
		}
		else{
			callback(false);
		}
	}

	// Start or stop single Elastic Beanstalk via Slack
	function ManageEnv(msg, myEnv, min, max) {
		var action = 'start';
		if(min == '0') action = 'stop';
		checkPermission(msg, Users, myEnv, function(res){
			if (res == true){
				isProd(myEnv, function(isprod){
					if (isprod == false){
						msg.send('Off to ' + action + ' the environment...');
						chooseRegion(myEnv,function(awsServices){
							var awsEBS = awsServices.EBS;
							var awsASG = awsServices.ASG;
							awsEBS.showEnvironmentRes(myEnv, function(err, data){
				    		if(err){
				      		msg.send("`Failed to find the information of " + myEnv + ".`");
				    		}
				    		else{
									var myEnvASG = data.EnvironmentResources.AutoScalingGroups[0].Name;
									awsASG.updateASGSize(myEnvASG, min, max, function(err, data){
										if(err){
											msg.send("`Failed to " + action + " the environment. " + err + "`");
										}
										else {
											msg.send("```Your environment has been " + action + 'ed. Use `aws eb show ' + myEnv + '`' + " to check.```");
											robot.messageRoom(SLACK_CHANNEL, "```" +  msg.message.user.name + " " + action + "s environment " + myEnv + ".```");
										}
									});
								}
							});
						});
					}
					else {
						msg.send("`¯\\_(ツ)_/¯ Sorry mate, but I don't want to touch production environments.`");
					}
				});
			}
			else {
				msg.send ("`Mate, you don't have permission!`");
				robot.messageRoom(SLACK_CHANNEL,  "`" +  msg.message.user.name + " doesn't have permssion to " + action + " environment " + myEnv + ".`");
			}
		});
	}

	// Start or stop single Elastic Beanstalk via API
	function WebHookManageEnv(user, password, myEnv, min, max, callback) {
		var action = 'start';
		if(min == '0') action = 'stop';
		WebHookcheckPermission(user, password, myEnv, function(res){
			if (res == true){
				isProd(myEnv, function(isprod){
					if (isprod == false){
						chooseRegion(myEnv,function(awsServices){
							var awsEBS = awsServices.EBS;
							var awsASG = awsServices.ASG;
							awsEBS.showEnvironmentRes(myEnv, function(err, data){
				    		if(err){
				    			robot.messageRoom(SLACK_CHANNEL, "`" + user + " failed to find the information of " + myEnv + ".`");
				    			callback(false);
				    		}
				    		else{
									var myEnvASG = data.EnvironmentResources.AutoScalingGroups[0].Name;
									awsASG.updateASGSize(myEnvASG, min, max, function(err, data){
										if(err){
										robot.messageRoom(SLACK_CHANNEL, "`" + user + " failed to " + action + myEnv + ": " + err + "`");
										callback(false);
										}
										else {
											if (action == "stop") {
												robot.messageRoom(SLACK_CHANNEL, "```" +  user + " is " + action + "ping " + myEnv + ".```");
											}
											else {
												robot.messageRoom(SLACK_CHANNEL, "```" +  user + " is " + action + "ing " + myEnv + ".```");
											}
											callback(true);
										}
									});
								}
							});
						});
					}
					else {
						robot.messageRoom(SLACK_CHANNEL, "`¯\\_(ツ)_/¯ Sorry mate, but I don't want " + user + " to " + action + " " + myEnvs + ".`");
						callback(false);
					}
				});
			}
			else {
				robot.messageRoom(SLACK_CHANNEL, "`" +  user + " doesn't have permssion to " + action + " environment " + myEnv + ".`");
				callback(false);
			}
		});
	}

	// Show Elastic Beanstalk environment details in Slack
	function ShowEnv(msg, myEnv) {
		chooseRegion(myEnv,function(awsServices){
			var awsEBS = awsServices.EBS;
			var awsASG = awsServices.ASG;
			var awsEC2 = awsServices.EC2;
			awsEBS.showEnvironment(myEnv, function(err, data){
      		if(err){
        		msg.send("`Failed to find the information of " + myEnv + ".`");
      		}
      		else{
        		if (typeof data.Environments[0] == 'undefined'){
          			msg.send("`Failed to find the information, does environment " + myEnv + " even exist? `");
        		}
        		else {
							envInfo = "EnvironmentName: " + data.Environments[0].EnvironmentName + "\n";
        			envInfo += "EnvironmentId: " + data.Environments[0].EnvironmentId + "\n";
        			envInfo += "ApplicationName: " + data.Environments[0].ApplicationName + "\n";
        			envInfo += "VersionLabel: " + data.Environments[0].VersionLabel + "\n";
        			envInfo += "SolutionStackName: " + data.Environments[0].SolutionStackName + "\n";
        			envInfo += "EndpointURL: " + data.Environments[0].EndpointURL + "\n";
        			envInfo += "CNAME: " + data.Environments[0].CNAME + "\n";
        			envInfo += "DateCreated: " + data.Environments[0].DateCreated + "\n";
        			envInfo += "DateUpdated: " + data.Environments[0].DateUpdated + "\n";
        			envInfo += "Status: " + data.Environments[0].Status + "\n";
        			envInfo += "AbortableOperationInProgress: " + data.Environments[0].AbortableOperationInProgress + "\n";
							awsEBS.showEnvironmentRes(myEnv, function(err, data1){
								envInfo += "AutoScalingGroup: " + data1.EnvironmentResources.AutoScalingGroups[0].Name + "\n";
								awsASG.showASG(data1.EnvironmentResources.AutoScalingGroups[0].Name, function(err, data2){
									if(typeof(data1.EnvironmentResources.LoadBalancers[0]) == 'undefined') {
										envInfo += "LoadBalancer: " + "you don't have a ELB."+ "\n";
									}
									else {
										envInfo += "LoadBalancer: " + data1.EnvironmentResources.LoadBalancers[0].Name + "\n";
									}
									var myEnvLC = data2.AutoScalingGroups[0].LaunchConfigurationName;
									envInfo += "LaunchConfigurationName: " + myEnvLC + "\n";
									if(myEnvLC.indexOf('SPOT') > -1){
										var instance = myEnvLC.split('-')[1];
										var price = myEnvLC.split('-')[2].split('+')[0];
										envInfo += "SpotInstance: " + instance + "\n";
										envInfo += "BidPrice: " + price + "\n";
									}
									else {
										envInfo += "SpotInstance: Disabled" + "\n";
									}
									envInfo += "Health: " + data.Environments[0].Health + "\n";
									var insNum = data1.EnvironmentResources.Instances.length;
									var insInfo = '';
									var j=5;
									if (insNum === 0){
										envInfo += "RunningInstance: 0 \n";
										envInfo += "--------------------------------------------------------------\n";
										envInfo += "Latest scaling activities:\n";
										awsASG.showASGLog(data1.EnvironmentResources.AutoScalingGroups[0].Name, function(err, data3){
											if (data3.Activities.length == 0) {
												envInfo += "could not find any...";
											}
											else {
												if (data3.Activities.length < j) {
													j = data3.Activities.length;
												}
												for (var i = 0; i < j; i++) {
													envInfo += data3.Activities[i].StartTime + ": " + data3.Activities[i].Description + "\n";
												}
											}
											msg.send("```" + envInfo + "```");
										});
									}
									else{
										var insIds = [];
										for (var i = 0; i < insNum; i++ ){
											var insId = data1.EnvironmentResources.Instances[i].Id;
											insIds.push(insId);
										}
										ShowEC2(awsEC2, insIds, function(insInfo){
											envInfo += "RunningInstance: " + insNum + " (" + insInfo.slice(0, -2) + ")\n";
											envInfo += "--------------------------------------------------------------\n";
										  envInfo += "Latest scaling activities:\n";
											awsASG.showASGLog(data1.EnvironmentResources.AutoScalingGroups[0].Name, function(err, data3){
												if (data3.Activities.length == 0) {
													envInfo += "could not find any...";
												}
												else {
													if (data3.Activities.length < j) {
														j = data3.Activities.length;
													}
													for (var i = 0; i < j; i++) {
														envInfo += data3.Activities[i].StartTime + ": " + data3.Activities[i].Description + "\n";
													}
												}
												msg.send("```" + envInfo + "```");
											});
										});
									}
								});
							});
        		}
      		}
    		});
		});
	}

	// Enable spot instance for Elastic Beanstalk via Slack
	function EnableSpot(msg, myEnv, instance, price){
		var d = new Date();
		var awsTime = '-'+d.getFullYear()+(d.getMonth()+1)+d.getDate()+d.getHours()+d.getMinutes()+d.getSeconds();
		checkPermission(msg, Users, myEnv, function(res){
			if (res == true){
				isProd(myEnv, function(isprod){
					if (isprod == false){
						msg.send('Off to enable spot instnace for the environment...');
						chooseRegion(myEnv,function(awsServices){
							var awsEBS = awsServices.EBS;
							var awsASG = awsServices.ASG;
							awsEBS.showEnvironmentRes(myEnv, function(err, data){
				    		if(err){
				      		msg.send("`Failed to find the information of " + myEnv + ".`");
				    		}
				    		else{
									var myEnvASG = data.EnvironmentResources.AutoScalingGroups[0].Name;
									var myEnvLC = data.EnvironmentResources.LaunchConfigurations[0].Name;
									var spotEnvLCName = "SPOT-" + instance + "-$" + price + "+" + myEnv + "+" + myEnvLC + awsTime;
									awsASG.showLC(myEnvLC, function(err, data){
										var spotEnvLC = data.LaunchConfigurations[0];
										spotEnvLC.LaunchConfigurationName = spotEnvLCName;
										spotEnvLC.SpotPrice = price;
										spotEnvLC.InstanceType = instance;
										delete spotEnvLC.LaunchConfigurationARN;
										delete spotEnvLC.CreatedTime;
										delete spotEnvLC.KernelId;
										delete spotEnvLC.RamdiskId;
										delete spotEnvLC.BlockDeviceMappings;
										awsASG.showASG(myEnvASG, function(err, data){
											var oldEnvLC = data.AutoScalingGroups[0].LaunchConfigurationName;
											awsASG.createLC(spotEnvLC, function(err, data){
												awsASG.updateASGLc(myEnvASG, spotEnvLCName, function(err, data){
													if(err){
														msg.send("`Oops, something went wrong. " + err + "`");
													}
													else {
														if (oldEnvLC.indexOf('SPOT-') > -1) {
															awsASG.deleteLC(oldEnvLC, function(err, data) {
																if(err) {
																	robot.messageRoom(SLACK_CHANNEL, "`" +  msg.message.user.name + " failed to remove old launch configuration " + oldEnvLC + ". "+ err +".`");
																}
															});
														}
														msg.send("```You have enabled spot instance (" + instance + "/$" + price + ") for " + myEnv + "```");
														robot.messageRoom(SLACK_CHANNEL, "`" +  msg.message.user.name + " enabled spot instance (" + instance + "/$" + price + ") for " + myEnv + ".`");
													}
												});
											});
										});
									});
				      	}
							});
						});
					}
					else {
						msg.send("`¯\\_(ツ)_/¯ Sorry mate, but I don't want to touch production environments.`");
					}
				});
			}
			else {
				msg.send ("`Mate, you don't have permission!`");
				robot.messageRoom(SLACK_CHANNEL, "`" +  msg.message.user.name + " doesn't have permssion to enable spot instance for " + myEnv + ".`");
			}
		});
	}

	// Enable spot instance for Elastic Beanstalk via API
	function WebHookEnableSpot(user, password, myEnv, instance, price, callback){
		var d = new Date();
		var awsTime = "-"+d.getFullYear()+(d.getMonth()+1)+d.getDate()+d.getHours()+d.getMinutes()+d.getSeconds();
		WebHookcheckPermission(user, password, myEnv, function(res){
			if (res == true){
				isProd(myEnv, function(isprod){
					if (isprod == false){
						chooseRegion(myEnv,function(awsServices){
							var awsEBS = awsServices.EBS;
							var awsASG = awsServices.ASG;
							awsEBS.showEnvironmentRes(myEnv, function(err, data){
				    		if(err){
				    			robot.messageRoom(SLACK_CHANNEL, "`" + user + " failed to bid spot instance for " + myEnv + ": " + err + "`");
				    			callback(false);
				    		}
				    		else{
									var myEnvASG = data.EnvironmentResources.AutoScalingGroups[0].Name;
									var myEnvLC = data.EnvironmentResources.LaunchConfigurations[0].Name;
									var spotEnvLCName = "SPOT-" + instance + "-$" + price + "+" + myEnv + "+" + myEnvLC + awsTime;
									awsASG.showLC(myEnvLC, function(err, data){
										var spotEnvLC = data.LaunchConfigurations[0];
										spotEnvLC.LaunchConfigurationName = spotEnvLCName;
										spotEnvLC.SpotPrice = price;
										spotEnvLC.InstanceType = instance;
										delete spotEnvLC.LaunchConfigurationARN;
										delete spotEnvLC.CreatedTime;
										delete spotEnvLC.KernelId;
										delete spotEnvLC.RamdiskId;
										delete spotEnvLC.BlockDeviceMappings;
										awsASG.showASG(myEnvASG, function(err, data){
											var oldEnvLC = data.AutoScalingGroups[0].LaunchConfigurationName;
											awsASG.createLC(spotEnvLC, function(err, data){
												awsASG.updateASGLc(myEnvASG, spotEnvLCName, function(err, data){
													if(err){
														robot.messageRoom(SLACK_CHANNEL, "`" + user + " failed to bid spot instance for " + myEnv + ": " + err + "`");
														callback(false);
													}
													else {
														if (oldEnvLC.indexOf('SPOT-') > -1) {
															awsASG.deleteLC(oldEnvLC, function(err, data) {
																if(err) {
																	robot.messageRoom(SLACK_CHANNEL, "`" + user + " failed to bid spot instance for " + myEnv + ": " + err + "`");
																	callback(false);
																}
															});
														}
														robot.messageRoom(SLACK_CHANNEL, "`" +  user + " bid spot instance (" + instance + "/$" + price + ") for " + myEnv + ".`");
														callback(true);
													}
												});
											});
										});
									});
				      	}
							});
						});
					}
					else {
						robot.messageRoom(SLACK_CHANNEL, "`¯\\_(ツ)_/¯ Sorry mate, but I don't want " + user + " to bid spot instance for " +  myEnvs + ".`");
						callback(false);
					}
				});
			}
			else {
				robot.messageRoom(SLACK_CHANNEL, "`" +  user + " doesn't have permssion to bid spot instance for " + myEnv + ".`");
				callback(false);
			}
		});
	}

	// Disable spot instance for Elastic Beanstalk via Slack
	function DisableSpot(msg, myEnv){
		checkPermission(msg, Users, myEnv, function(res){
			if (res == true){
				isProd(myEnv, function(isprod){
					if (isprod == false){
						msg.send('Off to disable spot instnace for the environment...');
						chooseRegion(myEnv,function(awsServices){
							var awsEBS = awsServices.EBS;
							var awsASG = awsServices.ASG;
							awsEBS.showEnvironmentRes(myEnv, function(err, data){
				    		if(err){
				      		msg.send("`Failed to find the information of " + myEnv + ".`");
				    		}
				    		else{
									var myEnvASG = data.EnvironmentResources.AutoScalingGroups[0].Name;
									var myEnvLC = data.EnvironmentResources.LaunchConfigurations[0].Name;
									awsASG.showASG(myEnvASG, function(err, data){
										var oldEnvLC = data.AutoScalingGroups[0].LaunchConfigurationName;
										awsASG.updateASGLc(myEnvASG, myEnvLC, function(err, data){
											if(err){
												msg.send("`Oops, something went wrong. " + err + "`");
											}
											else {
												if (oldEnvLC.indexOf('SPOT-') > -1) {
													awsASG.deleteLC(oldEnvLC, function(err, data) {
														if(err) {
															robot.messageRoom(SLACK_CHANNEL, "`" +  msg.message.user.name + " failed to remove old launch configuration " + oldEnvLC + ". "+ err +".`");
														}
													});
												}
												msg.send("```You have disabled spot instance for " + myEnv + "```");
												robot.messageRoom(SLACK_CHANNEL, "`" +  msg.message.user.name + " disabled spot instance for " + myEnv + ".`");
											}
										});
									});
				      	}
							});
						});
					}
					else {
						msg.send("`¯\\_(ツ)_/¯ Sorry mate, but I don't want to touch production environments.`");
					}
				});
			}
			else {
				msg.send ("`Mate, you don't have permission!`");
				robot.messageRoom(SLACK_CHANNEL, "`" +  msg.message.user.name + " doesn't have permssion to disable spot instance for " + myEnv + ".`");
			}
		});
	}

	// Disable spot instance for Elastic Beanstalk via API
	function WebHookDisableSpot(user, password, myEnv, callback){
		WebHookcheckPermission(user, password, myEnv, function(res){
			if (res == true){
				isProd(myEnv, function(isprod){
					if (isprod == false){
						chooseRegion(myEnv,function(awsServices){
							var awsEBS = awsServices.EBS;
							var awsASG = awsServices.ASG;
							awsEBS.showEnvironmentRes(myEnv, function(err, data){
				    		if(err){
				    			robot.messageRoom(SLACK_CHANNEL, "`" + user + " failed to disable spot instance for " + myEnv + ": " + err + "`");
				    			callback(false);
				    		}
				    		else{
									var myEnvASG = data.EnvironmentResources.AutoScalingGroups[0].Name;
									var myEnvLC = data.EnvironmentResources.LaunchConfigurations[0].Name;
									awsASG.showASG(myEnvASG, function(err, data){
										var oldEnvLC = data.AutoScalingGroups[0].LaunchConfigurationName;
										awsASG.updateASGLc(myEnvASG, myEnvLC, function(err, data){
											if(err){
												robot.messageRoom(SLACK_CHANNEL, "`" + user + " failed to disable spot instance for " + myEnv + ": " + err + "`");
												callback(false);
											}
											else {
												if (oldEnvLC.indexOf('SPOT-') > -1) {
													awsASG.deleteLC(oldEnvLC, function(err, data) {
														if(err) {
															robot.messageRoom(SLACK_CHANNEL, "`" +  user + " failed to remove old launch configuration " + oldEnvLC + ". "+ err +".`");
															callback(false);
														}
													});
												}
												robot.messageRoom(SLACK_CHANNEL, "`" +  user + " disabled spot instance for " + myEnv + ".`");
												callback(true);
											}
										});
									});
				      	}
							});
						});
					}
					else {
						robot.messageRoom(SLACK_CHANNEL, "`¯\\_(ツ)_/¯ Sorry mate, but I don't want " + user + " to disable spot instance for " +  myEnvs + ".`");
						callback(false);
					}
				});
			}
			else {
				robot.messageRoom(SLACK_CHANNEL, "`" +  user + " doesn't have permssion to disable spot instance for " + myEnv + ".`");
				callback(false);
			}
		});
	}

	// Show spot instance request status via Slack
	function ShowSpot(msg, sirId){
		msg.send('Off to check spot requests status...');
		var child = exec(__dirname + '/show_spot_status.sh ' + sirId, function(error, stdout, stderr) {
			if (error) console.log(error);
				process.stdout.write(stdout);
				process.stderr.write(stderr);
				msg.send("```" + stdout + "```");
			});
		}

	// Batch start or stop multiple Elastic Beanstalk via Slack
	function ManageEnvs(msg, action, myEnvs, group) {
		checkPermission(msg, Users, myEnvs, function(res){
			if (res == true){
				isProd(myEnvs, function(isprod){
					if (isprod == false){
						msg.send('Off to ' + action + ' the environments.');
						for (var i = 0; i < group.length; i++) {
							if (action == "stop") {
								msg.send("```" + action + 'ping ' + group[i][0] + "```");
								}
							else {
								msg.send("```" + action + 'ing ' + group[i][0] + "```");
							}
						chooseRegion(myEnvs,function(awsServices){
							var awsEBS = awsServices.EBS;
							var awsASG = awsServices.ASG;
						  var myEnv = group[i][0];
						  var min = group[i][1];
						  var max = group[i][2];
							awsEBS.showEnvironmentRes(myEnv, function(err, data){
				    		if(err){
				      		msg.send("`Failed to find the information of " + myEnv + ".`");
				    		}
				    		else{
									var myEnvASG = data.EnvironmentResources.AutoScalingGroups[0].Name;
									awsASG.updateASGSize(myEnvASG, min, max, function(err, data){
										if(err){
											msg.send("`Failed to " + action + " the environment. " + err + "`");
										}
										else {
											msg.send("```Your environment has been " + action + 'ed. Use `aws eb show ' + myEnv + '`' + " to check.```");
											//robot.messageRoom(SLACK_CHANNEL, "```" +  msg.message.user.name + " " + action + "s environment " + myEnv + ".```");
										}
									});
								}
							});						
						});
					}
					robot.messageRoom(SLACK_CHANNEL, "```" +  msg.message.user.name + " " + action + "s " + myEnvs + " environments.```");
					}
					else {
						msg.send("`¯\\_(ツ)_/¯ Sorry mate, but I don't want to touch production environments.`");
					}
				});
			}
			else {
				msg.send ("`Mate, you don't have permission!`");
				robot.messageRoom(SLACK_CHANNEL, "`" +  msg.message.user.name + " doesn't have permssion to " + action + " " + myEnvs + " environments.`");
			}
		});
	}

	// Batch start or stop multiple Elastic Beanstalk via API
	function WebHookManageEnvs(user, password, action, myEnvs, group, callback) {
		WebHookcheckPermission(user, password, myEnvs, function(res){
			if (res == true){
				isProd(myEnvs, function(isprod){
					if (isprod == false){
						for (var i = 0; i < group.length; i++) {
								if (action == "stop") {
									robot.messageRoom(SLACK_CHANNEL, "```" + user + " is " + action + 'ping ' + group[i][0] + "```");
									}
								else {
									robot.messageRoom(SLACK_CHANNEL, "```" + user + " is " + action + 'ing ' + group[i][0] + "```");
								}
							chooseRegion(myEnvs,function(awsServices){
								var awsEBS = awsServices.EBS;
								var awsASG = awsServices.ASG;
						  	var myEnv = group[i][0];
						  	var min = group[i][1];
						  	var max = group[i][2];	
								awsEBS.showEnvironmentRes(myEnv, function(err, data){
					    		if(err){
					    			robot.messageRoom(SLACK_CHANNEL, "`" + user + " failed to find the information of " + myEnv + ".`");
					    			callback(false);
					    		}
					    		else{
										var myEnvASG = data.EnvironmentResources.AutoScalingGroups[0].Name;
										awsASG.updateASGSize(myEnvASG, min, max, function(err, data){
											if(err){
											robot.messageRoom(SLACK_CHANNEL, "`" + user + " failed to " + action + myEnv + ": " + err + "`");
											callback(false);
											}
											else {
												if (action == "stop") {
													robot.messageRoom(SLACK_CHANNEL, "```" +  user + " is " + action + "ping " + myEnv + ".```");
												}
												else {
													robot.messageRoom(SLACK_CHANNEL, "```" +  user + " is " + action + "ing " + myEnv + ".```");
												}
												callback(true);
											}
										});
									}
								});				  			
							});
						}
					}
					else {
						robot.messageRoom(SLACK_CHANNEL, "`¯\\_(ツ)_/¯ Sorry mate, but I don't want " + user + " to " + action + " " + myEnvs + ".`");
						callback(false);
					}
				});
			}
			else {
				robot.messageRoom(SLACK_CHANNEL, "`" +  user + " doesn't have permssion to " + action + " " + myEnvs + " environments.`");
				callback(false);
			}
		});
	}

	// Custom auto-start or auto-stop schedule via Slack
	function AutoSwitch(msg, action, switchs, myEnv, schedule) {
		checkPermission(msg, Users, myEnv, function(res){
			if (res == true){
				isProd(myEnv, function(isprod){
					if (isprod == false){
						var child = exec(__dirname + '/auto_switch_schedule.sh ' + action + ' ' + switchs + ' ' + myEnv + ' ' + schedule, function(error, stdout, stderr) {
							if (error) console.log(error);
  						process.stdout.write(stdout);
 							process.stderr.write(stderr);
 							msg.send("```" + stdout + "```");
 						});
 						if (switchs == 'on' || switchs == 'off') {
							robot.messageRoom(SLACK_CHANNEL, "`" +  msg.message.user.name + " turned auto-" + action + ' ' + switchs + " for " + myEnv + " (" + schedule + ").`");
						}
					}
					else {
						msg.send("`¯\\_(ツ)_/¯ Sorry mate, but I don't want to touch production environments.`");
					}
				});
			}
			else {
				msg.send ("`Mate, you don't have permission!`");
				robot.messageRoom(SLACK_CHANNEL, "`" +  msg.message.user.name + " doesn't have permssion to turn auto-" + action + " " + switchs + " for " + myEnvs + ".`");
			}
		});
	}

	// Start or stop EC2 instances via Slack
	function ManageEC2(msg, action, myEnv, group) {
		if (group.length > 1) {
			checkPermission(msg, Users, myEnv, function(res){
				if (res == true){
					if (action == 'start') {
						chooseRegion(myEnv,function(awsServices){
							var awsEC2 = awsServices.EC2;
							awsEC2.startInstances(group, function(err, data) {
							if (err) {
								msg.send("`Failed to start " + myEnv + " search cluster. " + err + "`");
							}
							else {
								msg.send("```starting " + myEnv + " search cluster```");
								robot.messageRoom(SLACK_CHANNEL, "```" +  msg.message.user.name + " starts " + myEnv + " search cluster.```");
							}
							});
						});
					};
					if (action == 'stop') {
						chooseRegion(myEnv,function(awsServices){
							var awsEC2 = awsServices.EC2;
							awsEC2.stopInstances(group, function(err, data) {
								if (err) {
									msg.send("`Failed to stop " + myEnv + " search cluster. " + err + "`");
								}
								else {
									msg.send("```stopping " + myEnv + " search cluster.```");
									robot.messageRoom(SLACK_CHANNEL, "```" +  msg.message.user.name + " stops " + myEnv + " search cluster.```");
								}
							});
						});
					}
					if (action == 'show') {
						chooseRegion(myEnv,function(awsServices){
							var awsEC2 = awsServices.EC2;
							awsEC2.describeInstances(group, function(err, data) {
								if (err) {
									msg.send("`Failed to show " + myEnv + " search cluster. " + err + "`");
								}
								else {
									var psStatus = myEnv + " search cluster:\n";
									for(var i = 0; i < data.length; i++) {
										for(var j = 0; j < data[i].Instances[0].Tags.length; j++) {
											if (data[i].Instances[0].Tags[j].Key == 'Name') {
												psStatus += "\t" + data[i].Instances[0].Tags[j].Value + ": " + data[i].Instances[0].State.Name + "\n";
											}
										}
									}
									msg.send("```" + psStatus + "```");
								}
							});
						});
					}
				}
				else {
					msg.send ("`Mate, you don't have permission!`");
					robot.messageRoom(SLACK_CHANNEL, "`" +  msg.message.user.name + " doesn't have permssion to " + action + " " + myEnv + " search cluster.`");
				}
			});
		}
	}

	// Start or stop EC2 instances via API
	function WebHookManageEC2(user, password, action, myEnv, group) {
		if (group.length > 1) {
			WebHookcheckPermission(user, password, myEnv, function(res){
				if (res == true){
					if (action == 'start') {
						chooseRegion(myEnv,function(awsServices){
							var awsEC2 = awsServices.EC2;
							awsEC2.startInstances(group, function(err, data) {
								if (err) {
									robot.messageRoom(SLACK_CHANNEL, "`" + user + " " + "failed to start " + myEnv + " search cluster. " + err + "`");
									callback(false);
								}
								else {
									robot.messageRoom(SLACK_CHANNEL, "```" +  user + " is starting " + myEnv + " search cluster.```");
									callback(true);
								}
							});
						});
					};
					if (action == 'stop') {
						chooseRegion(myEnv,function(awsServices){
							var awsEC2 = awsServices.EC2;
							awsEC2.stopInstances(group, function(err, data) {
								if (err) {
									robot.messageRoom(SLACK_CHANNEL, "`" + user + " " + "failed to stop " + myEnv + " search cluster. " + err + "`");
									callback(false);
								}
								else {
									robot.messageRoom(SLACK_CHANNEL, "```" +  user + " is stopping " + myEnv + " search cluster.```");
									callback(true);
								}
							});
						});
					}
				}
				else {
					robot.messageRoom(SLACK_CHANNEL, "`" +  user + " doesn't have permssion to " + action + " " + myEnv + " search cluster.`");
					callback(false);
				}
			});
		}
	}

	// Check EC2 instance type and lifecycle
	function ShowEC2(awsEC2, group, callback) {
		var insNum = group.length;
		var insInfo = '';
		awsEC2.describeInstances(group, function(err, data) {
			console.log(data);
			for (var i = 0; i < insNum; i++ ){
				if (typeof data[i] == 'undefined') {
					var insId = '??';
					var insType = '??';
					var insPriIp = '??';
					var insLifeCycle = '??';
				}
				else {
					var insId = data[i].Instances[0].InstanceId;
					console.log('###############################################################')
					console.log(insNum + ' / ' + i + ' / ' + insId);
					console.log('###############################################################')
					var insType = data[i].Instances[0].InstanceType;
					var insPriIp = data[i].Instances[0].PrivateIpAddress;
					if (typeof data[i].Instances[0].InstanceLifecycle == "undefined") {
						var insLifeCycle = "on-demand";
					}
					else {
						var insLifeCycle = data[i].Instances[0].InstanceLifecycle;	
					}
				}
				//console.log(data[i].Instances[0]);
				insInfo += insId + '/' + insPriIp + '/' + insType + '/'+ insLifeCycle + ', ';
				if(i == insNum - 1) {
					callback(insInfo);
				}
			}
		});
	}

	/////////////////////
	//Slack Integration//
	/////////////////////

	// Help
	robot.respond(/aws eb (\/\?|\?|help)/i, function(msg){
    	sendHelp(msg);
  });

	// Start Elastic Beanstalk and EC2 instnaces if any
	robot.respond(/aws eb start (.*)/i, function(msg){
		var myEnvSpec = msg.match[1].replace(/ /g,'').toLowerCase().trim();
		if (typeof allEnvs[myEnvSpec] != 'undefined') {
			ManageEnvs(msg, 'start', myEnvSpec, allEnvs[myEnvSpec].start);
			ManageEC2(msg, 'start', myEnvSpec, allEnvs[myEnvSpec].ec2);
		}
		else {
			// Allow custom min:max of ASG
			if (myEnvSpec.indexOf('@') > -1) {
				var myEnv = myEnvSpec.split("@")[0];
				var myMin = myEnvSpec.split("@")[1].split(":")[0];
				var myMax = myEnvSpec.split("@")[1].split(":")[1];
			}
			else {
				// Default ASG min:max is 1:1
				var myEnv = myEnvSpec;
				var myMin = 1;
				var myMax = 1;
			}
			ManageEnv(msg, myEnv, myMin, myMax);
		}
	});

	// Stop Elastic Beanstalk and EC2 instances if any
	robot.respond(/aws eb stop (.*)/i, function(msg){
		var myEnv = msg.match[1].replace(/ /g,'').toLowerCase().trim();
		if (typeof allEnvs[myEnv] != 'undefined') {
			ManageEnvs(msg, 'stop', myEnv, allEnvs[myEnv].stop);
			ManageEC2(msg, 'stop', myEnv, allEnvs[myEnv].ec2);
		}
		else {
			ManageEnv(msg, myEnv, '0', '0');
		}
	});

	// Show Elastic Beanstalk details and EC2 instances status if any
	robot.respond(/aws eb show (.*)/i, function(msg){
		msg.send('Off to check the environment...');
		var myEnv = msg.match[1].replace(/ /g,'').toLowerCase().trim();
		if (typeof allEnvs[myEnv] != 'undefined') {
			msg.send("```Please specify which one: " + allEnvs[myEnv].members + "```");
			ManageEC2(msg, 'show', myEnv, allEnvs[myEnv].ec2);
		}
		else {
			ShowEnv(msg, myEnv);
		}
  });

	// Bid spot instance for Elastic Beanstalk environment
	robot.respond(/aws eb spot-on (.*) (.*) (.*)/i, function(msg){
		var myEnv = msg.match[1].replace(/ /g,'').toLowerCase().trim();
		var instance = msg.match[2].replace(/ /g,'').toLowerCase().trim();
		var price = msg.match[3].replace(/ /g,'').toLowerCase().trim();
		EnableSpot(msg, myEnv, instance, price);
	});

	// Disable spot instance for Elastic Beanstalk environment
	robot.respond(/aws eb spot-off (.*)/i, function(msg){
		var myEnv = msg.match[1].replace(/ /g,'').toLowerCase().trim();
		DisableSpot(msg, myEnv);
	});

	// Show bid price and current spot instance request status
	robot.respond(/aws eb spot-show (.*)/i, function(msg){
		var sirId = msg.match[1].replace(/ /g,'').toLowerCase().trim();
		ShowSpot(msg, sirId);
	});

	// Custom automatic scaleup and scaledown schedule
	robot.respond(/aws eb auto(stop|start)-(on|off|show) (.*)/i, function(msg){
		var action = msg.match[1].replace(/ /g,'').toLowerCase().trim();
		var switchs = msg.match[2].replace(/ /g,'').toLowerCase().trim();
		var myEnvmyShedule = msg.match[3].replace(/ /g,'').toLowerCase().trim();
		if (myEnvmyShedule.indexOf('@') > -1) {
			var myEnv = myEnvmyShedule.split("@")[0];
			var mySchedule = myEnvmyShedule.split("@")[1];
		}
		else {
			var myEnv = myEnvmyShedule;
			if (action == 'start') {
				// Default start at 8 AM
				var mySchedule = '08:00'
			}
			else {
				// Default stop at 6 PM
				var mySchedule = '18:00'
			}
		}
		AutoSwitch(msg, action, switchs, myEnv, mySchedule);
	});

///////////////
//Restful API//
///////////////

 // Stop environment 
 robot.router.post('/aws/eb/stop', function(req, res) {
 		var username = req.body.username;
 		var password = req.body.password;
  	var myEnv = req.body.server;
		if (typeof allEnvs[myEnv] != 'undefined') {
			WebHookManageEnvs(username, password, 'stop', myEnv, allEnvs[myEnv].stop, function(response){
	 			if (response) {
	 				WebHookManageEC2(username, password, 'stop', myEnv, allEnvs[myEnv].ec2, function(response1){
			 			if (response1) {
							res.send('successful');
						}
						else {
							res.send('falied');
						}		 					
	 				});
				}
				else {
					res.send('falied');
				}
			});
		}
		else {
			WebHookManageEnv(username, password, myEnv, '0', '0', function(response){
	 			if (response) {
					res.send('successful');
				}
				else {
					res.send('falied');
				}
			});
		}
	});

 // Start environment
 robot.router.post('/aws/eb/start', function(req, res) {
 	 	var username = req.body.username;
 		var password = req.body.password;
  	var myEnv = req.body.server;
		if (typeof allEnvs[myEnv] != 'undefined') {
			WebHookManageEnvs(username, password, 'start', myEnv, allEnvs[myEnv].start, function(response){
	 			if (response) {
	 				WebHookManageEC2(username, password, 'start', myEnv, allEnvs[myEnv].ec2, function(response1){
			 			if (response1) {
							res.send('successful');
						}
						else {
							res.send('falied');
						}		 					
	 				});
				}
				else {
					res.send('falied');
				}				
			});
		}
		else {
			WebHookManageEnv(username, password, myEnv, '1', '1',function(response){
				if (response) {
					res.send('successful');
				}
				else {
					res.send('falied');
				}
			});
		}
	});

 // Bid spot instance
 robot.router.post('/aws/eb/spoton', function(req, res) {
 		var username = req.body.username;
 		var password = req.body.password;
  	var myEnv = req.body.server;
  	var instance = req.body.instance;
  	var price = req.body.price;
  	WebHookEnableSpot(username, password, myEnv, instance, price, function(response){
			if (response) {
				res.send('successful');
			}
			else {
				res.send('falied');
			}
  	});
	});

 // Disable spot instance
 robot.router.post('/aws/eb/spotoff', function(req, res) {
 		var username = req.body.username;
 		var password = req.body.password;
  	var myEnv = req.body.server;
  	WebHookDisableSpot(username, password, myEnv, function(response){
			if (response) {
				res.send('successful');
			}
			else {
				res.send('falied');
			}  		
  	});
	});
}
