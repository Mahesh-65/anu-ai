#!/bin/sh
set -e
mkdir -p /app/chroma_db /app/temp_uploads
chown -R appuser:appuser /app/chroma_db /app/temp_uploads
exec su -s /bin/sh appuser -c "cd /app && exec $*"
