# Revisión de Control de inventarios — 18 de septiembre de 2026

## Cambios aplicados

- Nombre unificado en inicio, encabezado, pestaña del navegador, actualización y aplicación instalable.
- Eliminados «Modo Tableta» y la etiqueta duplicada del auditor. Se conservan Ubicado por, Auxiliado por e Intercambiar.
- Los diálogos cerrados ya no se ofrecen al teclado ni a las tecnologías de asistencia.
- Duplicar un adicional conserva automáticamente el borrador y elimina advertencias de serie de la captura anterior.
- Eliminado el registro redundante del service worker; su administración queda en el módulo de plataforma.
- Las actualizaciones recargan los recursos desde la red para no reutilizar archivos antiguos de la caché HTTP. El identificador de caché también cambia al modificar el generador del service worker.
- Se conservan las claves de almacenamiento y la URL para mantener acceso a los datos existentes.

## Verificación realizada

Build correcto. 28 pruebas unitarias correctas, una omitida porque requiere cuatro archivos originales que no se distribuyen en el repositorio.

Pruebas de navegador con Edge/Playwright, datos sintéticos y perfil aislado; escritorio de 1440 × 1000 y móvil de 390 × 844. Sin errores de consola durante los flujos probados.

| Flujo | Resultado |
| --- | --- |
| Número de empleado, confirmación, rechazo de pareja duplicada e intercambio | Correcto |
| Captura individual, masiva y reetiquetado; preservación de autoría | Correcto |
| Adicionales, duplicación y recuperación de borrador al recargar | Correcto |
| Quitar asignación y deshacer | Correcto |
| Importación XLSX y reimportación sin duplicar bienes | Correcto |
| Excel con nombres de auditores y sin columnas de empleado | Correcto |
| Guardar notas | Correcto |
| Vista previa de resguardo, pendientes y adicionales | Correcto |
| ZIP con imagen, inspección y restauración de contenido | Correcto |
| Rechazo de ZIP corrupto sin cambiar el inventario | Correcto |
| Importación de tags en worker, guardado y consulta RFID | Correcto |
| Cambio de pareja, recarga y apertura sin conexión | Correcto |
| Edición de ubicaciones, transferencia y conciliación de datos | Cubiertas por pruebas unitarias; sin recorrido completo de todas sus pantallas |

No se verificaron cámara física, lector RFID físico, impresora, instalación PWA en teléfono real ni grandes volúmenes de datos. Las imágenes del respaldo fueron sintéticas; no representan una prueba del dispositivo de captura. Estas pruebas no garantizan la ausencia de fallos fuera de los casos ejercitados.

## Mejoras siguientes propuestas

1. **Evitar edición simultánea en varias pestañas.** Las pestañas comparten IndexedDB y guardan el estado completo. Un aviso o bloqueo de escritura reduciría el riesgo de sobrescribir cambios de otra pestaña.
2. **Restauración con resumen y recuperación previa.** Mostrar cantidades antes de reemplazar el inventario y guardar un punto recuperable del estado anterior. Actualmente se valida el ZIP, pero la selección de un archivo válido inicia su restauración.
3. **Directorio de auditores transportable.** Incluir los registros locales de personas en un respaldo opcional. Actualmente el ZIP conserva la autoría de los bienes, pero el directorio personalizado permanece en ese navegador.
4. **Pruebas con archivos reales y equipos de trabajo.** Incorporar archivos anonimizados de formatos habituales y verificar cámara, escáner e impresión en los equipos donde se usará la aplicación.

