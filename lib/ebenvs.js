// Elastic Beanstalk envionrments configuration

module.exports = {

	// consolidated nonprod environment
	"myapp-nonprod": {
		"members": [
			"myapp-dev",
			"myapp-uat"
		],
		// scale up
		"start": [
			["myapp-dev", "1", "1"],
			["myapp-uat", "1", "2"]
		],
		// scale down
		"stop": [
			["myapp-dev", "0", "0"],
			["myapp-uat", "0", "0"]
		],
		// EC2 instances 
		"ec2": []
	},

	// consolidated prod environment
	"myapp-prod": {
		"members": [
			"myapp-prod-01",
			"myapp-prod-02"
		],
		"start": [
			["myapp-prod-01", "2", "4"],
			["myapp-prod-02", "2", "4"]
		],
		"stop": [
			["myapp-prod-01", "1", "1"],
			["myapp-prod-02", "1", "1"]
		],
		"ec2": [
			"i-074efe4c1742d91ff",
			"i-09035009b35146688",
			"i-0a90743dd52ade6fd"
		]
	}
}