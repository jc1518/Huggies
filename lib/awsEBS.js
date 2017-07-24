// Elastic Beanstalk module

module.exports = function(awsProfile, awsRegion){

  var AWS = require('aws-sdk');
  AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: awsProfile});
  AWS.config.region = awsRegion;

  var EBS = new AWS.ElasticBeanstalk();
  var awsEBS = {};

  awsEBS.showEnvironment = function(myEnv, callback){
    var params = {
        EnvironmentNames: [myEnv]
    };
    EBS.describeEnvironments(params, function(err, data){
      if(err){
        console.log(err);
        callback(err);
      }
      else{
        //console.log(data);
        callback(null,data);
      }
    });
  }

  awsEBS.showEnvironmentRes = function(myEnv, callback){
    var params = {
        EnvironmentName: myEnv
    };
    EBS.describeEnvironmentResources(params, function(err, data){
      if(err){
        console.log(err);
        callback(err);
      }
      else{
        //console.log(data);
        callback(null,data);
      }
    });
  }

  awsEBS.updateASG = function(myEnv, min, max, callback){
    var params = {
      EnvironmentName: myEnv,
      OptionSettings: [
        {
          Namespace: "aws:autoscaling:asg",
          ResourceName: "AWSEBAutoScalingGroup",
          OptionName: "MinSize",
          Value: min
        },
        {
          Namespace: "aws:autoscaling:asg",
          ResourceName: "AWSEBAutoScalingGroup",
          OptionName: "MaxSize",
          Value: max
        }    
      ]
    };
    EBS.updateEnvironment(params, function(err, data){
      if(err){
        console.log(err);
        callback(err);
      }
      else{
        //console.log(data);
        callback(null,data);
      }
    });
  }

  awsEBS.swapURL = function(from, to, callback){
    var params = {
      DestinationEnvironmentName: from,
      SourceEnvironmentName: to
    };
    EBS.swapEnvironmentCNAMEs(params, function(err, data){
      if(err){
        console.log(err);
        callback(err);
      }
      else{
        //console.log(data);
        callback(null,data);
      }
    });
  }

  return awsEBS

}



