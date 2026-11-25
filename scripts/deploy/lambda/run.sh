#!/bin/bash
# Arranque de Next.js standalone en Lambda. Lo ejecuta el Lambda Web Adapter
# (AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap), que luego traduce cada invocación en una petición HTTP.
# .next/cache es un enlace a /tmp, lo único escribible en Lambda.
mkdir -p /tmp/next-cache
cd "${LAMBDA_TASK_ROOT}/apps/web" || exit 1
HOSTNAME=127.0.0.1 exec node server.js
