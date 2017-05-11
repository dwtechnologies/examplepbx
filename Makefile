#####################
# DEPLOY PRODUCTION #
#####################
PROD_REGION=REGION
PROD_STACKNAME=CF-STACKNAME
PROD_AWS_LOCAL_PROFILE=AWS_PROFILE
PROD_S3BUCKET=S3_BUCKET_TO_PUT_CODE_ON
PROD_S3PREFIX=S3_PREFIX

.PHONY: build-prod
build-prod:
	@echo "Bulding PBX for Prod, Started ..."
	cd functions/mainMenu && npm install
	cd functions/teamMenu && npm install
	aws cloudformation package \
	--template-file cloudformation/cloudformation.yaml \
	--output-template-file dist/cloudformation-prod.yaml \
	--s3-bucket $(PROD_S3BUCKET) \
	--s3-prefix $(PROD_S3PREFIX) \
	--region $(PROD_REGION) \
	--profile $(PROD_AWS_LOCAL_PROFILE)
	@echo "Bulding PBX for Prod, Done!"

.PHONY: deploy-prod
deploy-prod: build-prod
	@echo "Deploying PBX to Prod, Started ..."
	aws cloudformation deploy \
	--template-file dist/cloudformation-prod.yaml \
	--stack-name $(PROD_STACKNAME) \
	--capabilities CAPABILITY_NAMED_IAM \
	--region $(PROD_REGION) \
	--profile $(PROD_AWS_LOCAL_PROFILE) \
	--parameter-overrides ResourceContext=prod \
	elkUser=REPLACE_ME \
	elkPass=REPLACE_ME \
	victorId=REPLACE_ME \
	victorKey=REPLACE_ME \
	authKey=REPLACE_ME \
	outgoingCallerID=REPLACE_ME \
	menuFile=REPLACE_ME \
	@echo "Deploy of PBX to Prod, Done!"



##################
# DEPLOY TESTING #
##################
TEST_REGION=REGION
TEST_STACKNAME=CF-STACKNAME
TEST_AWS_LOCAL_PROFILE=AWS_PROFILE
TEST_S3BUCKET=S3_BUCKET_TO_PUT_CODE_ON
TEST_S3PREFIX=S3_PREFIX

.PHONY: build-test
build-test:
	@echo "Bulding PBX for Test, Started ..."
	cd functions/mainMenu && npm install
	cd functions/teamMenu && npm install
	aws cloudformation package \
	--template-file cloudformation/cloudformation.yaml \
	--output-template-file dist/cloudformation-test.yaml \
	--s3-bucket $(TEST_S3BUCKET) \
	--s3-prefix $(TEST_S3PREFIX) \
	--region $(TEST_REGION) \
	--profile $(TEST_AWS_LOCAL_PROFILE)
	@echo "Bulding PBX for Test, Done!"

.PHONY: deploy-test
deploy-test: build-test
	@echo "Deploying PBX to Test, Started ..."
	aws cloudformation deploy \
	--template-file dist/cloudformation-test.yaml \
	--stack-name $(TEST_STACKNAME) \
	--capabilities CAPABILITY_NAMED_IAM \
	--region $(TEST_REGION) \
	--profile $(TEST_AWS_LOCAL_PROFILE) \
	--parameter-overrides ResourceContext=test \
	elkUser=REPLACE_ME \
	elkPass=REPLACE_ME \
	victorId=REPLACE_ME \
	victorKey=REPLACE_ME \
	authKey=REPLACE_ME \
	outgoingCallerID=REPLACE_ME \
	menuFile=REPLACE_ME \
	@echo "Deploy of PBX to Test, Done!"



#########
# CLEAN #
#########
.PHONY: clean
clean:
	rm dist/cloudformation-*.yaml