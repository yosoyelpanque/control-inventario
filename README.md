# Inventario por parejas

[Abrir aplicación](https://yosoyelpanque.github.io/inventario-parejas/)

Aplicación estática de verificación de bienes, basada en [Inventario Pro](https://github.com/yosoyelpanque/inventario-pro). Funciona sin cuentas, contraseñas ni servicios externos de acceso.

## Trabajo en pareja

1. Selecciona tu nombre y número de empleado. Si no apareces, registra una persona en el directorio local.
2. Elige a un compañero distinto y comienza la verificación.
3. Cada bien ubicado, reetiquetado o adicional nuevo guarda **Ubicado por** y **Auxiliado por**, con sus números de empleado.
4. Usa **Intercambiar** junto a los nombres para cambiar quién captura. Solo afecta las verificaciones siguientes; conserva los registros anteriores, el inventario, el resguardante activo y los borradores.
5. **Cambiar pareja** vuelve al selector sin borrar el inventario.

Los detalles de bienes y el Excel incluyen la pareja. Los respaldos ZIP conservan la atribución de cada bien. Al editar un adicional existente se conserva su pareja original. Al quitar una asignación se limpian ambos participantes. Los registros antiguos sin compañero muestran «Sin registro»; no se inventa una autoría retroactiva.

## Almacenamiento y traslado

El inventario se guarda en IndexedDB en un espacio común de este navegador; no depende de quién captura. La pareja activa se recuerda en la pestaña y el directorio de personas registradas se guarda en este navegador. No hay sincronización entre dispositivos. El directorio local de personas no forma parte del ZIP; puede registrarse nuevamente en otro equipo.

Para trasladar el inventario anterior, exporta un respaldo ZIP desde la aplicación de origen y restáuralo en la nueva. La nueva aplicación usa un espacio separado y no borra el anterior. Comprueba la restauración antes de borrar datos del origen. La primera apertura requiere conexión; después se almacenan los recursos para uso sin conexión.

## Desarrollo y publicación

Con Node.js: `npm start` y abrir `http://127.0.0.1:4173/`.

```sh
npm ci
npm run build
npm test
```

GitHub Pages publica la raíz de la rama `main`. Regenera `sw.js` con `npm run build:cache` después de cada cambio. El aviso de nueva versión permite actualizar después de guardar la captura.

No subir Excel, respaldos ni fotografías reales al repositorio. Pruebas: `npm test`; una prueba de importación original requiere archivos de ejemplo no incluidos y se omite cuando faltan.
