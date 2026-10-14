#!/bin/sh
set -e

echo "Waiting for database..."

echo "Applying migrations..."
python manage.py migrate --noinput

if [ "${AUTO_SEED:-false}" = "true" ]; then
  echo "Seeding demo data (skipped if data already exists)..."
  python manage.py seed_data
fi

echo "Starting Django development server on 0.0.0.0:8000"
exec python manage.py runserver 0.0.0.0:8000
