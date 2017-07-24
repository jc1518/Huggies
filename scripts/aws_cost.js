// Description:
// huggies for AWS cost via CloudHealth
// Commands:
// hubot aws cost help

var AWS_ACCOUNT_ID =  process.env.AWS_ACCOUNT_ID;
var API_KEY = process.env.CLOUDHEALTH_API_KEY;
var API_ENDPOINT = 'https://chapi.cloudhealthtech.com/olap_reports/';
var omb = require('../lib/cloudhealth');

module.exports = function(robot){
	// Help
	function sendHelp(msg){
		helpString = "Usage:\n";
		helpString += '\t`aws cost saving` - show month to date saving\n';
		helpString += '\t`aws cost <monthly|weekly|daily|hourly>` - show AWS monthly/weekly/daily/hourly cost';
		msg.send("```" + helpString + "```");
	}

	robot.respond(/aws cost (\/\?|\?|help)/i, function(msg){
	  	sendHelp(msg);
	});

	// Month to date AWS cost saving
	robot.respond(/aws cost saving/i, function(msg){
		msg.send('Let me find it out...');
		uri = API_ENDPOINT + 'cost/current?interval=monthly' + '&dimensions[]=time&dimensions[]=AWS-Service-Category&measures[]=cost&filters[]=AWS-Account:select:' + AWS_ACCOUNT_ID + '&api_key=' + API_KEY;
		omb.findGap(uri, 'time', msg);
	});

	// Monthly/weekly/daily/hourly AWS cost
	robot.respond(/aws cost (monthly|weekly|daily|hourly)/i, function(msg){
		msg.send('Off to get the bill...');
		interval = msg.match[1].replace(/ /g,'').toLowerCase().trim();
		uri = API_ENDPOINT + 'cost/current?interval=' + interval + '&dimensions[]=time&dimensions[]=AWS-Service-Category&measures[]=cost&filters[]=AWS-Account:select:' + AWS_ACCOUNT_ID + '&api_key=' + API_KEY;
		omb.findCost(uri, 'time', msg);
	});		
}