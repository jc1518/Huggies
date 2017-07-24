// CloudHealth module

var https = require('https');
var request = require('request');

var omb = {};

function parseBill(uri,dimension,callback){
  var yourBill = '';
  var gap = '';
  var options = {
    uri: uri,
    headers: { 'Accept': 'application/json'  }
  };

  request(options, function(error, response, body) {
    bill = JSON.parse(body);
	  var months = [];
    bill.dimensions[0][dimension].forEach(function(month){
	    months.push(month.label);
    });

    var costs = [];
    bill.data.forEach(function(cost){
	    costs.push(cost);
    });

    var subcost = [];
    costs.forEach(function(cost){
	    subcost.push(cost[0]);
    });

    for (var i = months.length - 1; i > 0; i--) {
      yourBill += months[i] + ': $' + Math.round(subcost[i]*100)/100 + '\n';
    };

    gap = subcost[months.length - 2] - subcost[months.length - 1];
    gap = Math.round(gap*100)/100;

    var callBackString= {};
    callBackString.value1 = yourBill;
    callBackString.value2 = gap;
    callback(callBackString);
   });
 };

omb.findCost = function(uri, dimension, msg){
  parseBill(uri,dimension,function(result){
    // console.log(yourBill);
    yourBill = result.value1
    msg.send("```" + yourBill + "```");
  });
}

omb.findGap = function(uri, dimension, msg){
  parseBill(uri,dimension,function(result){
    gap = result.value2
    //  console.log(gap);
    if (gap < 0){
      bonus = 'Forget it mate, the month-to-date cost is $' + gap * (-1) + ' higher than last month.';
    }
    else{
      bonus = 'Yeah, it is still possible. The month-to-date cost is $' + gap + ' lower than last month.';
    }
    msg.send("```" + bonus + "```");
  });
}

module.exports = omb;
