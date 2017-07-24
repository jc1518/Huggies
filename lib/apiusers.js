// Api users
// Authenticate against encryped password

module.exports = {

  // Reserverd for huggies
	"huggies": {
		"role": [
			"admin"
		],
		"password": "$2a$10$FJ8.9B4xztRzY7kRPIUb0uX6Uv/VeXToBz2Q9NRppdIz9EeOY6iZi"
	},

  // Jackie Chen
	"jackiechen": {
		"role": [
			"admin"
		],
		"password": "$2a$10$QBeWbknqNkhpjjOBshImgOKB/prxOh3DakOMrPyt248m6L4Y5CCH2"
	},	

	// User 001
	"user001": {
		"role": [
			"myapp-dev"
		],
		"password": "$2a$10$iVg40s4Hf9S0AcTCFC6ZG.4ez3VlH5XbyXaldB6b0EbDNityfa6/2"
	},

  // User 002
	"user002": {
		"role": [
			"myapp-dev", "myapp-uat"
		],
		"password": "$2a$10$7TvfaG0741M2NbjO/S723uughh/GyK6xjHAXJWVBbFUF9U/WiVDBG"
	}	
}