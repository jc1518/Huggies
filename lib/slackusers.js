// Slack users
// Identified by registered Email address
// Use Slack SSO so the Email can not be changed
// https://get.slack.help/hc/en-us/articles/203772216-SAML-single-sign-on

module.exports = {

	// Access to all environments
	"support+slack@jackiechen.org": {
		"role": [
			"admin"
		]
	},

	// Access to dev environment only
	"user001@jackiechen.org": {
		"role": [
			"myapp-dev"
		]
	},

		// Access to dev and uat environments
	"user002@jackiechen.org": {
		"role": [
			"myapp-dev", "myapp-uat"
		]
	}
}
