// Funciones transversales para UI y formato

function obtenerHoraActual() {
    return new Date().toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function capitalizar(texto) {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mostrarToastGenerico(toastElement, mensaje, duracion = 2500) {
    if (!toastElement) return;
    toastElement.textContent = mensaje;
    toastElement.classList.remove("hidden");

    setTimeout(() => {
        toastElement.classList.add("hidden");
    }, duracion);
}

// Renderiza un badge visual para ingreso o egreso (usado en porteria y admin)
function generarBadgeMovimiento(tipo) {
    const clase = tipo === "ingreso" ? "ingreso" : "egreso";
    const texto = tipo === "ingreso" ? "ingreso" : "egreso";

    return `
        <span class="movement-badge ${clase}">
            <span class="movement-dot"></span>
            ${texto}
        </span>
    `;
}