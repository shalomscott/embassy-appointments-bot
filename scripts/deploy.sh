#!/bin/bash

STACK_NAME='jlembassy-telegram'
PACKAGE_BUCKET='jlembassy-packages'
GENERATED_TEMPLATE='gen-template.yml'

# Install dependencies
npm install --production

# Package (Uploads a package file to S3)
sam package \
	--s3-bucket "$PACKAGE_BUCKET" \
	--output-template-file "$GENERATED_TEMPLATE"

# Deploy
sam deploy \
	--template-file "$GENERATED_TEMPLATE" \
	--stack-name "$STACK_NAME" \
	--capabilities CAPABILITY_IAM \
	--parameter-overrides "$(cat '.params' | tr '\n' ' ')"

# Cleanup
rm "$GENERATED_TEMPLATE"
