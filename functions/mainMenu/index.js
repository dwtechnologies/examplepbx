"use strict"

const aws = require("aws-sdk")
const js46elks = require("js46elks")
const kms = new aws.KMS()

let elks
let menuFile

// Create the different team mappings
const teams = {
	1: "team-1",
	2: "team-2",
	3: "team-3"
}

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

		// Create the elks object
		elks = new js46elks(decrypted.elkUser, decrypted.elkPass)

		// IVR sound files
		menuFile = process.env.MENUFILE

		try {
			let teamUrl = "https://" + event.headers.Host + "/" + event.requestContext.stage + "/{team}?key=" + decrypted.allowedKey

			// Create the IVR.
			let ivr = new elks.ivr(menuFile)

			for (let i in teams) {
				ivr.addDestination(i, teamUrl.replace("{team}", teams[i]))
			}

			callback(null, { statusCode: 200, body: ivr.exec() })
		}
		catch (err) {
			callback(err, { statusCode: 503 })
		}

	})
}

// Decrypt the values and store it in an object.
function decryptAll(callback) {
	let decrypted = {}

	decrypt(process.env.ELKUSER, (err, decryptUser) => {
		if (err) {
			callback(err, decryptUser)
			return
		}
		decrypted.elkUser = decryptUser

		decrypt(process.env.ELKPASS, (err, decryptPass) => {
			if (err) {
				callback(err, decryptUser)
				return
			}
			decrypted.elkPass = decryptPass

			decrypt(process.env.AUTHKEY, (err, decryptAllowedKey) => {
				if (err) {
					callback(err, decryptUser)
					return
				}
				decrypted.allowedKey = decryptAllowedKey

				callback(err, decrypted)
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