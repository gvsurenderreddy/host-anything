#!/bin/sh

bin/hostanything https://github.com/NaturalNode/natural.git index.js 'function(module) { var x = new module.NounInflector(); return function(token) { return x.pluralize(token); }; }'
aws lambda create-function --region us-east-1 --function-name Pluralize  --zip-file fileb://.dist/package.zip --role arn:aws:iam::983570204227:role/lambda_basic_execution --handler __host-anything-lambda-handler__.handler --runtime nodejs  --timeout 10 --memory-size 1024
aws lambda invoke --invocation-type RequestResponse --function-name Pluralize --region us-east-1 --payload '{ "token": "cat" }' outputfile.txt

[[ "$(cat outputfile.txt)" == '"cats"' ]]
