#!/bin/bash
# Marcador de posición hasta la primera publicación: responde 200 en el endpoint de salud (para la
# comprobación de arranque del Lambda Web Adapter) y 503 en el resto.
exec node "${LAMBDA_TASK_ROOT}/placeholder.mjs"
