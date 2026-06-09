#!/bin/bash

# If DB_ADAPTER and DB_URI are set, automatically run DB migrations/prepare before starting
if [ ! -z "$DB_ADAPTER" ] && [ ! -z "$DB_URI" ]; then
    echo "Running database migrations/preparation..."
    node ./bin/konga.js prepare --adapter "$DB_ADAPTER" --uri "$DB_URI"
fi

if [ $# -eq 0 ]
  then
    # If no args are set, start the app as usual
    node --harmony app.js
  else
    while getopts "c:a:u:" option
    do
        case "${option}"
            in
            c) COMMAND=${OPTARG};;
            a) ADAPTER=${OPTARG};;
            u) URI=${OPTARG};;
        esac
    done

    if [ "$COMMAND" == "prepare" ]
        then
            node ./bin/konga.js $COMMAND --adapter $ADAPTER --uri $URI
        else
            echo "Invalid command: $COMMAND"
            exit
    fi
fi




