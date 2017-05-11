"use strict"

const qs = require("querystring")
const aws = require("aws-sdk")
const js46elks = require("js46elks")
const jsvictorops = require("jsvictorops")
const kms = new aws.KMS()

let callerid = {}
let elks = {}
let victorops = {}

exports.handler = function (event, context, callback) {
	// Decrypt allowedKey and check it against the provided one, return 403 if allowed key doesn't match
	decryptAll((err, decrypted) => {
		// If we got a decryption error return 503 error
		if (err) {
			callback(err, { statusCode: 503 })
			return
		}

		// Check that the allowed key is correct
		if (event.queryStringParameters.key !== decrypted.allowedKey) {
			let err = new Error("Unauthorized connection from", event.requestContext.identity.sourceIp, "ua", event.requestContext.identity.userAgent)
			callback(err, { statusCode: 403 })
			return
		}

		// Default outgoing CID when we don't want to show A-number
		callerid = process.env.CALLERID

		elks = new js46elks(decrypted.elkUser, decrypted.elkPass)
		victorops = new jsvictorops(decrypted.victorId, decrypted.victorKey)

		// Get parameters from body.
		let params = checkBody(event.body)
		if (params instanceof Error) {
			callback(params, { statusCode: 503 })
		}

		getOnCallNumbers(event.pathParameters.team, (err, numbers) => {
			if (err) {
				callback(err, { statusCode: 503 })
				return
			}

			let connect = generateConnect(numbers)
			callback(null, { statusCode: 200, body: connect.exec() })
		})

	})
}

// getOnCallNumbers will send an array of numbers for the user on call for the specified team to the callback.
function getOnCallNumbers(team, callback) {
	victorops.teamOnCallSchedule(team, 0, 0, 0, (err, sched) => {
		if (err) {
			callback(err, { statusCode: 503 })
			return
		}

		let user = sched.getCurrentOnCallUsername()
		if (user instanceof Error) {
			callback(user, { statusCode: 503 })
			return
		}

		victorops.userPhones(user, (err, phones) => {
			if (err) {
				callback(err, { statusCode: 503 })
				return
			}

			let numbers = phones.getPhoneNumbers()
			callback(null, numbers)
		})
	})
}

// generateConnect will generate a connect object recursivly based on the numbers array
function generateConnect(numbers) {
	let connect = {}

	for (let i in numbers) {
		connect = new elks.connect(numbers[i], callerid, "", "", "", "", connect)
	}

	return connect
}

// checkBody checks that we have the minumum amount of parameters
function checkBody(body) {
	if (!body) {
		return new Error("Missing body.")
	}
	let params

	try {
		params = qs.parse(body)
	}
	catch (err) {
		return new Error("Error parsing JSON body.")
	}

	if (!params.direction || !params.from || !params.to || !params.callid) {
		return new Error("Body didn't contain all the necessary parameters.")
	}

	return params
}

// Decrypt the values and store it in an object.
function decryptAll(callback) {
	let decrypted = {}

	decrypt(process.env.ELKUSER, (err, decryptUser) => {
		if (err) {
			callback(err, null)
			return
		}
		decrypted.elkUser = decryptUser

		decrypt(process.env.ELKPASS, (err, decryptPass) => {
			if (err) {
				callback(err, null)
				return
			}
			decrypted.elkPass = decryptPass

			decrypt(process.env.AUTHKEY, (err, decryptAllowedKey) => {
				if (err) {
					callback(err, null)
					return
				}
				decrypted.allowedKey = decryptAllowedKey

				decrypt(process.env.VICTORID, (err, decryptVictorId) => {
					if (err) {
						callback(err, null)
						return
					}
					decrypted.victorId = decryptVictorId

					decrypt(process.env.VICTORKEY, (err, decryptVictorKey) => {
						if (err) {
							callback(err, null)
							return
						}
						decrypted.victorKey = decryptVictorKey

						callback(err, decrypted)
					})
				})
			})
		})
	})
}

function decrypt(encryptedText, callback) {
	kms.decrypt({ CiphertextBlob: new Buffer.from(encryptedText, "base64") }, (err, data) => {
		if (err) {
			callback(err, null)
			return
		}

		callback(null, new Buffer.from(data.Plaintext, "base64").toString("ascii"))
	})
}