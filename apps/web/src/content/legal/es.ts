import type { LegalDoc } from "./types";

export const privacy: LegalDoc = {
  updated: "2026-11-18",
  sections: [
    {
      id: "summary",
      title: "Resumen",
      body: [
        "ft_transcendence es un proyecto de aficionados: un juego de Pong en línea con cuentas, amigos, chat y torneos. Solo recogemos lo que el juego necesita para funcionar, nunca lo vendemos y puedes eliminar tu cuenta en cualquier momento.",
      ],
    },
    {
      id: "what-we-collect",
      title: "Qué recogemos",
      body: ["Cuando usas la aplicación guardamos:"],
      list: [
        "Datos de la cuenta: tu nombre de usuario, tu correo y un hash con sal de tu contraseña (nunca la contraseña en sí).",
        "Si inicias sesión con Google: el ID de tu cuenta de Google, tu nombre, correo y foto de perfil, tal como los comparte Google.",
        "Tu avatar, si subes uno (PNG, JPEG o WebP, hasta 2 MB).",
        "Datos de juego: las partidas que juegas (oponente, marcadores, fecha, duración), torneos, victorias y derrotas.",
        "Datos sociales: solicitudes de amistad, amigos y los jugadores que bloqueas.",
        "Datos de sesión: por cada dispositivo con sesión iniciada, la dirección IP y el nombre del navegador, para que puedas ver y revocar tus sesiones.",
        "Datos de autenticación en dos pasos, si la activas: un secreto del autenticador cifrado y códigos de respaldo con hash.",
        "Claves de API que crees: solo un hash de cada clave y sus primeros caracteres.",
      ],
    },
    {
      id: "why",
      title: "Para qué los usamos",
      list: [
        "Para que puedas iniciar sesión y mantener tu cuenta segura.",
        "Para emparejarte con oponentes, gestionar partidas y torneos, y mostrar tus estadísticas e historial.",
        "Para mostrar tu perfil, tu presencia (en línea, en partida, desconectado) y tus amigos a otros jugadores.",
        "Para prevenir abusos, como los intentos de inicio de sesión por fuerza bruta.",
      ],
    },
    {
      id: "visible",
      title: "Qué pueden ver otros jugadores",
      body: [
        "Otros jugadores con sesión iniciada pueden ver tu nombre de usuario, avatar, presencia, estadísticas e historial de partidas. Tu correo, sesiones, claves de API y jugadores bloqueados nunca se muestran a nadie más.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies y almacenamiento local",
      list: [
        "Una cookie de sesión (ft.session_token), necesaria para mantener tu sesión iniciada. Es httpOnly, por lo que los scripts de la página no pueden leerla.",
        "Una cookie de idioma (ft_lang) que recuerda inglés, español o francés.",
        "Almacenamiento local en tu navegador para las preferencias de visualización: efectos CRT, movimiento reducido y sonido.",
      ],
      body: ["No usamos cookies publicitarias ni de analítica de terceros."],
    },
    {
      id: "retention",
      title: "Cuánto tiempo los conservamos",
      body: [
        "Tus datos se conservan mientras exista tu cuenta. Las sesiones caducan tras 7 días sin uso. Al eliminar tu cuenta se borran tu perfil, amigos, sesiones, claves y avatar; las partidas terminadas permanecen en el historial de tus oponentes con tu antiguo nombre de usuario.",
      ],
    },
    {
      id: "rights",
      title: "Tus derechos",
      body: [
        "Puedes ver y cambiar tu perfil en Ajustes, revocar sesiones y claves de API, y pedir una copia o la eliminación de tus datos. Respondemos a las solicitudes en un plazo de 30 días.",
      ],
    },
    {
      id: "security",
      title: "Seguridad",
      body: [
        "Todo el tráfico usa HTTPS. Las contraseñas se guardan con hash, las sesiones se pueden revocar en cualquier momento y hay autenticación en dos pasos disponible. Ningún sistema es perfectamente seguro, así que usa una contraseña única.",
      ],
    },
    {
      id: "contact",
      title: "Contacto",
      body: ["Para cualquier duda o solicitud sobre privacidad, contacta con el responsable del proyecto a través del repositorio de GitHub del proyecto."],
    },
  ],
};

export const terms: LegalDoc = {
  updated: "2026-11-18",
  sections: [
    {
      id: "agreement",
      title: "Acuerdo",
      body: [
        "Al crear una cuenta o jugar, aceptas estos términos. Si no estás de acuerdo, no uses el servicio. ft_transcendence es un proyecto gratuito y sin fines comerciales, ofrecido tal cual.",
      ],
    },
    {
      id: "account",
      title: "Tu cuenta",
      list: [
        "Debes tener al menos 13 años.",
        "Mantén en secreto tu contraseña y tus claves de API; eres responsable de la actividad de tu cuenta.",
        "Una persona, una cuenta. Los nombres de usuario que suplanten a otros o sean ofensivos pueden cambiarse o eliminarse.",
      ],
    },
    {
      id: "fair-play",
      title: "Juego limpio",
      list: [
        "No hagas trampas, no automatices el juego ni explotes errores para ganar.",
        "No acoses, amenaces ni hagas spam a otros jugadores. Usa Bloquear si alguien te molesta.",
        "No intentes romper, sobrecargar ni obtener acceso no autorizado al servicio.",
      ],
    },
    {
      id: "content",
      title: "Contenido que subes",
      body: [
        "Conservas los derechos sobre tu avatar y tus mensajes. Nos das permiso para almacenarlos y mostrarlos para hacer funcionar el servicio. No subas nada ilegal ni que no tengas derecho a compartir.",
      ],
    },
    {
      id: "api",
      title: "API pública",
      body: [
        "Las claves de API dan acceso de lectura a los datos públicos del juego. Respeta los límites de uso; las claves usadas de forma abusiva pueden ser revocadas.",
      ],
    },
    {
      id: "termination",
      title: "Suspensión y eliminación",
      body: [
        "Podemos suspender las cuentas que incumplan estos términos. Puedes dejar de usar el servicio y pedir que se elimine tu cuenta en cualquier momento.",
      ],
    },
    {
      id: "liability",
      title: "Sin garantía",
      body: [
        "El servicio puede cambiar, no estar disponible o perder datos sin previo aviso. En la medida que permita la ley, no somos responsables de ninguna pérdida derivada de su uso.",
      ],
    },
    {
      id: "changes",
      title: "Cambios",
      body: ["Podemos actualizar estos términos. La fecha de arriba indica la última versión; seguir usando el servicio significa que la aceptas."],
    },
  ],
};
