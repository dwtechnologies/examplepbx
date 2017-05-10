# examplepbx

Quick and dirty package for a On Call Service that connects to 46elks and VictorOps.
It's written without the async package, so expect some callback hell when viewing the KMS Decrypt phase :)
So it could have been a bit nicer with a waterfall. But anyways.

The code in the example will create an IVR-menu (Voice prompt menu) that will connect the calling user to the
specific person that is on call for the specified team.

The menu audio will be supplied by a file that in this example is `https://example.com/ivr/menu.mp3`.

It will also force the outgoing callerid on the call to be set to `+123456789`. This is so that the user that is OnCall knows it's a OnCall
and not a private call. This could easily be changed by just removing the callerid setting (it will then default to the callers callerid).

In the example we are using teams called `team-1`, `team-2` and `team-3`.

## Requirements

- AWS (Lambda, API Gateway, AMI, KMS, S3)
- jsvcitorops (js package)
- js46elks (js package)

## Example Menu

1. team-1
2. team-2
3. team-3

## Contexts in the Makefile

- test
- prod

You will need to edit the `Makefile` so that the different contexts have the correct parameters and uses the correct AWS Profile.

## Deploying

Please see the `Makefile`. You will need to make sure that the AWS PROFILE is setup correctly to correspond to your local
AWS profile for the correct context account.

```bash
make deploy-test
make deploy-prod
```

## CloudFormation

The included CloudFormation will create the following resources

- mainMenu lambda function
- teamMenu lambda function
- apiGateway
- RESOURCE /{team}
  - METHOD POST for /
  - METHOD POST for /{team}
  - STAGE called (prod/stage/test depending on target)
  - DEPLOYMENT of the STAGE above
- ROLE + POLICY for Lambda / API Gateway permissions
- KMS Key for the lambda function

Please note that you need to run the CloudFormation first to create the KMS Key.
So you will need to run it once and then update the Makefile with the correct passwords and such afterwards.


## CloudFormation parameters

The program needs the following parameters set in CloudFormation to work.

```text
ApplicationName = Name of Application (default: examplepbx)
ResourceContext = Stage Context (default: test)
victorId = VictorOps ID (default: VICTORID)
victorKey = VictorOps KEY (default: VICTORKEY)
elkUser = 46Elks User (default: ELKSUSER)
elkPass = 46Elks Password (default: ELKSPASS)
authKey = Auth Key, so that we can deny request not comming from applications without our AuthKey (default: AUTHKEY)
outgoingCallerID = Outgoing CallerID (default: +123456789)
menuFile = URL to Menu mp3 (default: https://example.com/ivr/menu.mp3)
```


The following parameters needs to be encrypted with the included KMS Key `victorId`, `victorKey`, `elkUser`, `elkPass`, `authKey`.
The other parameters should be in plaintext.

The `prod` targets in the Makefile have all the correct values all ready encrypted for deployment. 

## Encrypt values using KMS

```bash
aws kms encrypt --profile AWS-PROFILE --key-id KEY-ID --output text --region REGION --query CiphertextBlob --plaintext "ValueToEncrypt"
```

## Usage in 46elks

The url you get after running `deploy` should be inserted into the 46elks under numbers (add number if you allready haven't) and "voice_start".
Please also add the query-string ?key=AUTHKEY to the main menu.

eg. `https://url-to-api-gateway.com/prod?key=OUR_AUTH_KEY`.

## Usage in VictorOps

The only thing you have to do in VictorOps is to create an API ID and KEY.