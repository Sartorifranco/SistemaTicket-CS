// script_hash.js
const bcrypt = require('bcrypt');
const saltRounds = 10; // Este es el "costo" del hashing. 10 es un buen valor por defecto.
const password = "123456"; // ¡Esta es la contraseña que quieres hashear!

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error("Error al generar el hash:", err);
        return;
    }
    console.log("Tu contraseña hasheada es:");
    console.log(hash); // Aquí se imprimirá el hash que necesitas
});