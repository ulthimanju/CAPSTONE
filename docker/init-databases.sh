#!/bin/bash
# Creates multiple databases in a single postgres instance
set -e

function create_database() {
    local database=$1
    echo "Creating database: $database"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        SELECT 'CREATE DATABASE $database' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_database $db
    done
fi

# Run identity triggers on identity_db if SQL file exists
if [ -f /docker-entrypoint-initdb.d/init-identity-triggers.sql ]; then
    echo "Applying identity triggers and functions to identity_db..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d identity_db -f /docker-entrypoint-initdb.d/init-identity-triggers.sql
fi
