// Description:
// huggies main help information
// Commands:
// hubot huggies help

module.exports = function(robot){

	// Help
	function sendHelp(msg) {
		helpString = "Usage:\n";
		helpString += '\t`aws cost ?` - See CloudHealth subcommands\n';
		helpString += '\t`aws eb ?  ` - See AWS Elastic Beanstalk subcommands\n';
		helpString += '\t`ops ?     ` - See Opsgenie subcommands';
		msg.send("```" + helpString + "```");
	};

	robot.respond(/huggies ?(.+)?/i, function(msg) {
	  	sendHelp(msg);
	});
}