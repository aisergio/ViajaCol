# Evidencia: spec 003 (plataforma de publicación)

Registro del 25 y el 26 de noviembre de 2026. Las secciones del 25 son anteriores a las rutas
públicas: esas pruebas van directo a CloudFront con el secreto del origen, como lo haría el Worker.

## Infraestructura (T023)

- **Resultado:** `terraform apply` creó 46 recursos, sin rutas públicas, sin regla de tasa y sin
  webhook.
- **Incidente:** el primer intento falló al crear `aws_codebuild_project` con *«User is not authorized
  to access connection»*, por la propagación de IAM del rol recién creado. El segundo terminó bien.
- **Escaneo:** Checkov 3.4.10 dio 133 verificaciones aprobadas, 0 fallidas y 20 excepciones con
  motivo. TFLint salió limpio.

## Despliegue de prueba (T024)

| Paso | Resultado |
|---|---|
| Paquete de CI (`deploy.yml`, job «Paquete de Lambda», PR #5) | Zip de 12,2 MiB, 26 estáticos |
| `publish-web.sh`: versión 1 (commit `5fed645`) | Publicada en 58 s. **Páginas con 500**: *«Failed to proxy https://localhost:8080/ViajaCol/es»* |
| Diagnóstico local con el mismo paquete | `HOSTNAME=127.0.0.1` da 500 y `HOSTNAME=0.0.0.0` da 200 (research D-01) |
| `publish-web.sh`: versión 2 (commit `1ec067b`, con `HOSTNAME=0.0.0.0`) | Publicada en 54 s |

## Verificación a través de CloudFront (versión 2)

| Prueba | Resultado |
|---|---|
| `GET /ViajaCol/api/health` | 200 · `{"status":"ok","version":"1ec067b…"}` · primer byte en frío: 1,64 s |
| `/ViajaCol`, `/en`, `/sitios`, `/fiestas`, `/en/platos` | 200 en todas, entre 0,34 y 0,59 s |
| Ruta inexistente | 404 (página del sitio) |
| `<title>` y `lang` | ES: `es-CO` · EN: `en` |
| HTML | `Cache-Control: s-maxage=31536000` (caché en CloudFront, invalidada al publicar) |
| Estático `/ViajaCol/_next/static/chunks/*.js` | 200 desde S3 · `public, max-age=31536000, immutable` · `Hit from cloudfront` |
| `POST /ViajaCol/api/health` con `x-amz-content-sha256` | `{"status":"ok","received":8}` (FR-008) |
| Cabeceras | HSTS 2 años sin subdominios, `nosniff`, `Referrer-Policy`, CSP base, `X-Frame-Options: DENY`, `Permissions-Policy` y `Server-Timing` |
| CloudFront sin secreto, o con uno falso | 403 |
| Function URL directa | 403 |
| S3 directo | 403 |

## Restauración (T017, SC-005)

| Acción | Cambio del alias | Total con invalidación |
|---|---|---|
| `rollback.sh` a la versión 1 | 9 s | 35 s |
| `rollback.sh` a la versión 2 | 8 s | 34 s |

El alias `live` quedó en la versión 2.

## Dominio antes de activar las rutas (SC-002, línea base)

Foto del 2026-11-25 a las 21:48 UTC con
[`scripts/infra/domain-snapshot.mjs`](../../scripts/infra/domain-snapshot.mjs). Guarda el estado, las
cabeceras estables y el hash del cuerpo de cada ruta.

| Ruta | Estado |
|---|---|
| `/`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico` y una ruta inexistente | 522 |
| `/PlanEstudio` y `/MediPoli` | 308 hacia la misma ruta con `/` al final |
| `/PlanEstudio/` y `/MediPoli/` | 200 |
| `/ViajaCol`, `/viajacol`, `/ViajaColombia` y `/viajacolombia` | 522 |

- **La raíz ya respondía 522** antes de cualquier cambio: Cloudflare no logra conectar con el origen
  de la raíz. No depende de esta spec.
- **Variación propia:** dos fotos seguidas dan 0 diferencias. Para eso se normalizan el Ray ID, la hora
  y la IP de la página de error, y se ignoran las cabeceras de caché (`via`, `x-amz-cf-id`, `x-cache`).
- **Zona:**
  - plan Free;
  - siete rutas de Workers, de los otros dos proyectos;
  - sin dominios personalizados;
  - sin regla de tasa previa, así que la de ViajaCol ocupará la única que admite el plan.

## Activación de las rutas, la regla de tasa y el webhook (T009, T014)

El 2026-11-26, con la aprobación del dueño:

- **`terraform apply`:** 7 recursos nuevos (las 5 rutas del Worker, la regla de tasa y el webhook del
  runner), 1 cambio sin efecto en el código del Worker y 0 borrados. Cloudflare aceptó la regla con
  `starts_with` en el plan Free.
- **Secretos:** los seis `DEPLOY_*` se cargaron con `sync-deploy-secrets.ps1`, sin mostrarlos.

## Dominio después de activar las rutas (SC-002)

- **Referencia:** dos fotos tomadas minutos antes del apply dan 0 diferencias entre sí. La foto del
  día anterior no sirve: la página 522 muestra el centro de datos de Cloudflare que atendió (hoy,
  Miami) y cambia de un día a otro.
- **Comparación después del apply:**

| Ruta | Resultado |
|---|---|
| `/`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico` y una ruta inexistente | Igual (522) |
| `/PlanEstudio`, `/PlanEstudio/`, `/MediPoli` y `/MediPoli/` | Igual |
| `/ViajaColombia` y `/viajacolombia` | Mismo 522 y mismo cuerpo. Solo pierden `content-length`, porque ahora pasan por el Worker: sus rutas cubren todo lo que empieza por `/ViajaCol` |
| `/ViajaCol` | 522 → 200 (cambio propio) |
| `/viajacol` | 522 → 301 (cambio propio) |

## Verificación de la dirección pública (SC-001, SC-003, FR-003 a FR-011, FR-020)

Desde Colombia, el 2026-11-26, todavía con la versión de prueba (`1ec067b`):

| Prueba | Resultado |
|---|---|
| `/ViajaCol`, `/en`, `/sitios`, `/fiestas` y `/en/platos` | 200, `lang` correcto (`es-CO` o `en`) y primer byte entre 78 y 120 ms, desde la caché de CloudFront |
| Ruta inexistente | 404 |
| `/api/health` | 200 con la versión y `Cache-Control: no-store` |
| Estático `/_next/static` | `public, max-age=31536000, immutable` |
| `/viajacol`, `/VIAJACOL`, `/Viajacol` y `/viajaCol` | 301 a `/ViajaCol` |
| `/viajacol/en/platos?x=1` | 301 a `/ViajaCol/en/platos?x=1` |
| `/ViajaColombia` | 522, como antes: el Worker la deja pasar |
| POST con cuerpo | `{"status":"ok","received":8}` (FR-008) |
| POST de 1,1 MB | 413 (FR-009) |
| CloudFront, Function URL y S3 directos | 403 (SC-003) |
| Ráfaga de peticiones a la portada | 429 en la petición 151 (límite de 150 cada 10 s), con `retry-after: 10`. A los 15 s vuelve el 200 (FR-010) |
| Cabeceras de diagnóstico | `x-cache`, `age` y `server-timing` con el POP (`MIA3`). `via` nombra un servidor de CloudFront, no la distribución (FR-020) |

- **Falla encontrada:** la redirección 301 y el 413, que genera el propio Worker, salían sin las seis
  cabeceras de seguridad. Se corrigió después (ver las correcciones).

## Primera publicación desde main (T015, SC-004)

La ejecución [45760538715](https://github.com/aisergio/ViajaCol/actions/runs/45760538715) publicó el
commit `362dfef`, la fusión del PR #5:

| Paso | Hora (UTC) | Resultado |
|---|---|---|
| Paquete | 05:16–05:17 | 33 s |
| Intento 1 | 05:17–05:37 | El runner arrancó antes de la aprobación, terminó por tiempo a los 15 minutos y el job quedó en cola sin runner. El incidente está en el ADR 0005 |
| Intento 2 | 05:37–05:45 | Relanzado; esta vez CodeBuild esperó la aprobación. Publicó en 41 s la versión 3 de la función (antes, la 2) |
| Prueba de humo | 05:45 | En verde: versión, ES/EN y 404, cabeceras, POST, redirección y origen protegido |

- **Versión visible:** `/api/health` responde
  `{"status":"ok","version":"362dfefffcd09b09d6216318ae5f09b0be742e13"}`.
- **SC-004:** el trabajo automático tomó 74 s (paquete y publicación), pero esta primera vez hubo que
  relanzar el job. Se volvió a medir en la segunda publicación, ya con la aprobación en su propio job.

## Lighthouse (SC-006)

- **Cómo se midió:** Lighthouse 13.6.0 con `@lhci/cli` 0.16.1, en móvil emulado y con 3 corridas
  por página. Se corrió desde el PC del responsable (Colombia, Chrome 158) sobre la versión
  `362dfef`, con las mismas aserciones de `apps/web/lighthouserc.json`. Todas pasan.
- **Resultados** (mediana; entre paréntesis, el rango de las 3 corridas):

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Portada | 96 (93–98) | 100 | 92 | 92 | 1,6 s | 180 ms | 0 |
| `/sitios` | 97 (96–97) | 100 | 92 | 92 | 1,8 s | 140 ms | 0 |
| `/en` | 97 | 100 | 92 | 92 | 1,6 s | 130 ms | 0 |

- **Lo que resta puntos viene del dominio, no de la aplicación:**
  - **SEO, `robots-txt`:** Lighthouse lee `/robots.txt` en la raíz del dominio, que responde 522.
  - **Buenas prácticas, errores en la consola:**
    - El navegador pedía `/favicon.ico` en la raíz, que da 522, porque la página no declaraba ícono.
      Se corrigió después: ahora declara `/ViajaCol/icon.svg`.
    - Cloudflare Web Analytics inyecta su script en todo el dominio y la CSP del sitio lo bloquea.
      Hay que decidir si se permite en la CSP o si se excluye la ruta en Cloudflare.

## Correcciones tras la verificación

- **Cabeceras del Worker:** la redirección 301 y el 413 llevan ahora las seis cabeceras de FR-006,
  con pruebas en `worker.test.mjs`. La prueba de humo también las revisa en la redirección.
- **Aprobación:** pasa a su propio job, en un runner de GitHub. Los jobs de CodeBuild se crean ya
  aprobados y los secretos `DEPLOY_*` pasan al repositorio (ADR 0005, actualización del 2026-11-26).
- **Ícono:** la página declara `/ViajaCol/icon.svg`, el isotipo de la marca. El navegador ya no pide
  `/favicon.ico` a la raíz del dominio.

## Segunda publicación desde main (T030, SC-004)

El 2026-11-26 se fusionó el PR #7. Como cambiaba el Worker y la prueba de humo, la aprobación esperó
a que se aplicara el Worker.

- **Worker:** a las 23:09 UTC, `terraform apply` cambió 1 recurso (el código de
  `cloudflare_workers_script.edge`) y no creó ni borró ninguno. El plan muestra además `observability`
  en cada ejecución. Es una diferencia del proveedor sin efecto: la API vuelve a poner los mismos
  valores.
- **Comprobación en producción:**

| Respuesta | Resultado |
|---|---|
| `/viajacol` y `/VIAJACOL/en/platos?x=1` | 301 con las seis cabeceras, y HSTS sin subdominios |
| POST de 1,1 MB | 413 con las seis cabeceras |

- **Publicación:** la ejecución
  [45907930371](https://github.com/aisergio/ViajaCol/actions/runs/45907930371) publicó el commit
  `0c6d09c`:

| Paso | Hora (UTC) | Resultado |
|---|---|---|
| Fusión | 22:56:48 | PR #7 |
| Paquete | 22:56:56–22:57:26 | 30 s |
| Aprobación de producción | 23:21:38–23:21:41 | En un runner de GitHub. La espera incluyó el apply del Worker y renovar la sesión de AWS |
| Publicar en producción | 23:21:55–23:22:38 | El runner de CodeBuild arrancó 14 s después de la aprobación. Publicó en 34 s la versión 4 de la función |
| Prueba de humo | 23:22:34–23:22:37 | En verde, incluidas las cabeceras de la redirección |

- **Versión visible:** `/api/health` responde
  `{"status":"ok","version":"0c6d09c15a97bd45a52e42aae26e6c6771ece301"}`. La página declara
  `/ViajaCol/icon.svg`, que responde 200 con `image/svg+xml`.
- **SC-004 se cumple en lo que depende de la plataforma:**
  - La versión quedó visible 53 s después de la aprobación.
  - El paquete compila mientras se espera la aprobación, y terminó 38 s después de la fusión. Con una
    aprobación inmediata, la versión queda visible unos 1,5 minutos después de fusionar.
  - Esta vez pasaron 26 minutos entre la fusión y la versión visible, por la espera deliberada de la
    aprobación.
  - La publicación no necesitó comandos locales. El apply del Worker sí, porque los cambios de la IaC
    del borde se aplican desde el PC del responsable.
- **Secretos:** después de esta publicación, que ya usó los `DEPLOY_*` del repositorio, se borraron
  sus copias del entorno `production`. El entorno conserva sus revisores requeridos y su política de
  ramas.

## Pendiente

- La confirmación de la suscripción al correo de alertas (T021, el dueño).
- Qué hacer con el script de Cloudflare Web Analytics: permitirlo en la CSP o excluir la ruta en
  Cloudflare (va con el ADR de la CSP).
