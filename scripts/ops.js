// Description:
// huggies for Opsgenie
// Commands:
// hubot ops help

var OPSGENIE_API_KEY = process.env.OPSGENIE_API_KEY
var OPSGENIE_SCHEDULE = process.env.OPSGENIE_SCHEDULE

var request = require('request');
var querystring = require('querystring');

module.exports = function(robot){

	// Help
	function sendHelp(msg) {
		helpString = "Usage:\n";
		helpString += '\t`ops who is oncall` - See who is the poor guy this week';
		msg.send("```" + helpString + "```");
	};

	robot.respond(/ops (\/\?|\?|help)/i, function(msg) {
	  	sendHelp(msg);
	});

	robot.respond(/ops who is (oncall|on call)/i, function(msg) {
		msg.send('Let me check who is the poor guy...');
		var qs = querystring.stringify({
			"apiKey": OPSGENIE_API_KEY,
			"name": OPSGENIE_SCHEDULE
		});

		var options = {
			url: 'https://api.opsgenie.com/v1.1/json/schedule/whoIsOnCall' + '?' + qs,
			headers: {
				'Content-Type': 'application/json'
			}
		};

		request.get(options, function(err, res, body) {
			if (err) {
				msg.send("`Oops, someting went wrong " + err + "`");
			}
			else {
				if (res.statusCode === 200) {
					poorguy = JSON.parse(body).participants[0].name.split("@",1)[0];
					msg.send("```" + poorguy + " is oncall now```");
				}
				else {
					msg.send("`Oops, something went wrong:  " + JSON.parse(body).error + "`");
				}
			}
		});
	});
}