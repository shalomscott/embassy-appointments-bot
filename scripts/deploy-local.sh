#!/bin/bash

# Check that cron service is running:
# systemctl status cron.service
# systemctl start cron.service

COMMAND="npm run run-local"

job_exists() {
    crontab -l | grep -q "$COMMAND"
}

create_job() {
    if ! job_exists; then
        (crontab -l ; echo "*/5 * * * * $COMMAND") | crontab -
        # Confirm that the job was added
        echo "New cron job added:"
        crontab -l
    else
        echo "Job for '$COMMAND' already exists."
    fi
}

remove_job() {
    if job_exists; then
        crontab -l | sed "/$COMMAND/d" | crontab -
        echo "Cron job for '$COMMAND' has been removed."
    else
        echo "No cron job found for '$COMMAND'."
    fi
}

if [[ $1 = 'remove' ]]; then
    remove_job
else
    create_job
fi




