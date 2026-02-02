// generate_multiple_hashes.js
const bcrypt = require('bcrypt');
const saltRounds = 10; // El costo del hashing. 10 es un buen valor por defecto.

async function generateHashes() {
    // Contraseña para 'francosartori'
    const passwordFranco = "123456";
    const hashFranco = await bcrypt.hash(passwordFranco, saltRounds);
    console.log(`Hash para francosartori (contraseña: "${passwordFranco}"):`);
    console.log(hashFranco);
    console.log(''); // Salto de línea para mejor legibilidad

    // Contraseña para 'juanperez'
    const passwordJuan = "password2"; // Una contraseña diferente
    const hashJuan = await bcrypt.hash(passwordJuan, saltRounds);
    console.log(`Hash para juanperez (contraseña: "${passwordJuan}"):`);
    console.log(hashJuan);
    console.log('');

    // Contraseña para 'mariagomez'
    const passwordMaria = "password3"; // Otra contraseña diferente
    const hashMaria = await bcrypt.hash(passwordMaria, saltRounds);
    console.log(`Hash para mariagomez (contraseña: "${passwordMaria}"):`);
    console.log(hashMaria);
    console.log('');

    // Si tuvieras otro usuario con la MISMA contraseña que 'francosartori'
    const passwordOtro = "123456"; // La misma contraseña que francosartori
    const hashOtro = await bcrypt.hash(passwordOtro, saltRounds);
    console.log(`Hash para otro_usuario (contraseña: "${passwordOtro}" - ¡mismo texto que francosartori!):`);
    console.log(hashOtro);
    console.log('');
    console.log('¡Observa que el hash para "otro_usuario" es diferente al de "francosartori" aunque la contraseña sea la misma!');
}

generateHashes();
