#!/bin/bash
# Arranque de Next.js standalone en Lambda. Lo ejecuta el Lambda Web Adapter
# (AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap), que luego traduce cada invocación en una petición HTTP.
# .next/cache es un enlace a /tmp, lo único escribible en Lambda.
#
# HOSTNAME=0.0.0.0 es obligatorio: Next 16 arma la URL interna de las reescrituras (las de idioma de
# next-intl) con este valor y la compara con "localhost". Con 127.0.0.1 las toma por externas, las
# reenvía por https a sí mismo y responde 500. Con 0.0.0.0 usa "localhost" y todo queda interno.
# Dentro de Lambda no hay tráfico entrante directo, así que escuchar en 0.0.0.0 no expone nada.
mkdir -p /tmp/next-cache
cd "${LAMBDA_TASK_ROOT}/apps/web" || exit 1
HOSTNAME=0.0.0.0 exec node server.js
