(function (root) {
  'use strict';
  const forbidden = new Set(['loggedIn', 'currentUser', 'companion', 'serialNumberCache', 'accessToken', 'refreshToken', 'idToken', '__proto__', 'constructor', 'prototype']);
  function clean(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Respaldo de inventario inválido');
    const result = {};
    for (const [key, value] of Object.entries(input)) if (!forbidden.has(key)) result[key] = value;
    for (const key of ['inventory','additionalItems','resguardantes']) {
      if (key in result && !Array.isArray(result[key])) throw new Error(`El campo ${key} debe ser una lista`);
    }
    return result;
  }
  root.InventoryData = { clean };
  if (typeof module !== 'undefined') module.exports = { clean };
})(globalThis);
