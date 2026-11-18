import type { LegalDoc } from "./types";

export const privacy: LegalDoc = {
  updated: "2026-11-18",
  sections: [
    {
      id: "summary",
      title: "Resumen",
      body: [
        "VOLLEY.EXE es un proyecto de aficionados: un juego de Pong en línea con cuentas, amigos, chat y torneos. Solo recogemos lo que el juego necesita para funcionar, nunca lo vendemos y puedes eliminar tu cuenta en cualquier momento.",
      ],
    },
    {
      id: "what-we-collect",
      title: "Qué recogemos",
      body: ["Cuando usas la aplicación guardamos:"],
      list: [
        "Datos de la cuenta: tu nombre de usuario, tu correo y un hash con sal de tu contraseña (nunca la contraseña en sí).",
        "Tu avatar, si subes uno (PNG, JPEG o WebP, hasta 2 MB).",
        "Datos de juego: las partidas que juegas (oponente, marcadores, fecha, duración), torneos, victorias y derrotas.",
        "Datos sociales: solicitudes de amistad, amigos y los jugadores que bloqueas.",
        "Datos de sesión: por cada dispositivo con sesión iniciada, la dirección IP y el nombre del navegador, para que puedas ver y revocar tus sesiones.",
        "Datos de autenticación en dos pasos, si la activas: un secreto del autenticador cifrado y códigos de respaldo con hash.",
        "Llaves de acceso, si añades una: la clave pública y un nombre (la clave privada nunca sale de tu dispositivo).",
        "Dispositivos de inicio de sesión: una etiqueta como «Firefox en Windows» por cada navegador desde el que inicias sesión, para avisarte por correo cuando se use uno nuevo.",
        "Tu aspecto: las piezas del avatar pixelado, el marco y el aspecto de pala que elegiste.",
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
        "Otros jugadores con sesión iniciada pueden ver tu nombre de usuario, avatar, presencia, estadísticas e historial de partidas. Tu correo, sesiones y jugadores bloqueados nunca se muestran a nadie más.",
      ],
    },
    {
      id: "security",
      title: "Seguridad de la cuenta",
      body: [
        "Cuando eliges una contraseña, la comprobamos contra filtraciones de datos conocidas con el servicio de anonimato k de Have I Been Pwned: solo salen de nuestro servidor los 5 primeros caracteres del hash SHA-1 de la contraseña, nunca la contraseña. Salvo que este servidor funcione sin correo, el inicio de sesión espera a que confirmes tu dirección. Te avisamos por correo cuando alguien inicia sesión en tu cuenta desde un navegador nuevo y cuando alguien intenta registrarse con tu dirección. Si el operador lo activa, el registro, el inicio de sesión y el restablecimiento de contraseña incluyen Cloudflare Turnstile, una comprobación antibots que se ejecuta en tu navegador y procesa Cloudflare.",
      ],
    },
    {
      id: "ai",
      title: "Coach y filtro del chat",
      body: [
        "El Coach usa un modelo de IA que funciona en nuestro propio servidor: tus preguntas y sus respuestas se quedan en este servicio y no se guardan. (Si el operador cambia el Coach a un proveedor de IA externo, tus preguntas se enviarán a ese proveedor para generar la respuesta, y esta página lo indicará.) Los mensajes del chat pasan por un filtro automático de palabras en nuestro servidor: las palabrotas y los insultos discriminatorios se ocultan (por ejemplo \"m*****\") antes de guardar el mensaje. Solo puedes enviar enlaces a tus amigos. Los insultos discriminatorios y enviar el mismo mensaje una y otra vez cuentan como avisos; tres avisos en 24 horas pausan tu chat durante una hora. Ningún contenido del chat se envía a terceros.",
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
        "Tus datos se conservan mientras exista tu cuenta. Las sesiones caducan tras 7 días sin uso. Al eliminar tu cuenta se borran de inmediato tu perfil, correo, amigos, bloqueos, mensajes, sesiones, métodos de inicio de sesión, verificación en dos pasos y avatar; las partidas terminadas permanecen en el historial de tus oponentes como \"Jugador eliminado\".",
      ],
    },
    {
      id: "rights",
      title: "Tus derechos",
      body: [
        "Puedes ver y cambiar tu perfil en Ajustes, revocar sesiones y, en Ajustes → Tus datos, descargar una copia de todo lo que guardamos sobre ti o eliminar tu cuenta tú mismo. Para cualquier otra cosa, escríbenos y respondemos en un plazo de 30 días. Solo te enviamos correos para confirmar tu dirección, restablecer tu contraseña y confirmar una descarga de datos o la eliminación de la cuenta.",
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
        "Al crear una cuenta o jugar, aceptas estos términos. Si no estás de acuerdo, no uses el servicio. VOLLEY.EXE es un proyecto gratuito y sin fines comerciales, ofrecido tal cual.",
      ],
    },
    {
      id: "account",
      title: "Tu cuenta",
      list: [
        "Debes tener al menos 13 años.",
        "Mantén en secreto tu contraseña; eres responsable de la actividad de tu cuenta.",
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
