#!/bin/bash

# Run Lambda locally
sam local invoke \
    --parameter-overrides="$(cat '.params' | tr '\n' ' ')" \
    --env-vars <(echo '{ "Lambda": { "DYNAMODB_TABLE": "jlembassy-telegram-Table-U6CJAJ8FNRH2" } }')

