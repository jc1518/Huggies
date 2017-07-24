// EC2 module

module.exports = function(awsProfile, awsRegion){

  var AWS = require('aws-sdk');
  AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: awsProfile});
  AWS.config.region = awsRegion;

  var EC2 = new AWS.EC2();
  var awsEC2 = {};

  awsEC2.startInstances = function(list, callback) {
    var params = {
      InstanceIds: list
    };
    EC2.startInstances(params, function(err, data) {
        if (err) {
          console.log(err, err.stack); 
          callback(err, null);
        } else {
          //console.log(data);
          callback(null, data);
        }
    });
  }

  awsEC2.stopInstances = function(list, callback) {
    var params = {
      InstanceIds: list
    };
    EC2.stopInstances(params, function(err, data) {
        if (err) {
          console.log(err, err.stack); 
          callback(err, null);
        } else {
          //console.log(data);
          callback(null, data);
        }
    });
  }

  awsEC2.describeInstances = function(list, callback) {
    var params = {
      InstanceIds: list
    };
    EC2.describeInstances(params, function(err, data) {
        if (err) {
          console.log(err, err.stack); 
          callback(err, null);
        } else {
          callback(null, data.Reservations);
        }
    });
  }

  awsEC2.describeSpotRequests = function(list, callback) {
    var params = {
      SpotInstanceRequestIds: list
    };
    EC2.describeSpotInstanceRequests(params, function(err, data) {
        if (err) {
          console.log(err, err.stack); 
          callback(err, null);
        } else {
          callback(null, data.SpotInstanceRequests);
        }
    });
  }  

  return awsEC2

}
