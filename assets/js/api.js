// URL centralizada para todo el sistema
const API_URL = "https://script.google.com/macros/s/AKfycbysdUcvHyHPYIyEjkqPJipvmUjV6IQ6jaCvyUauQ8dllZxnRtMzbZ8AU6-svBJS52mm/exec";

// Función centralizada para obtener usuario
function obtenerUsuarioLogueado() {
    try {
        const guardado = localStorage.getItem("usuarioLogueado");
        return guardado ? JSON.parse(guardado) : null;
    } catch (error) {
        return null;
    }
}

// Función centralizada para peticiones (GET y POST)
async function apiFetch(endpoint_o_params, method = "GET", bodyData = null) {
    const usuario = obtenerUsuarioLogueado();

    if (!usuario || !usuario.token) {
        cerrarSesion();
        throw new Error("Sesión no válida o expirada.");
    }

    let url = API_URL;
    let options = {
        method: method,
        redirect: "follow"
    };

    if (method === "GET") {
        const separador = endpoint_o_params.includes("?") ? "&" : "?";
        url = API_URL + endpoint_o_params + separador + "token=" + encodeURIComponent(usuario.token);
    } else if (method === "POST") {
        const formData = new FormData();
        formData.append("token", usuario.token);

        if (bodyData) {
            for (const key in bodyData) {
                formData.append(key, bodyData[key]);
            }
        }
        options.body = formData;
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.ok === false && data.error === "No autorizado") {
            cerrarSesion();
            throw new Error("No autorizado");
        }

        return data;
    } catch (error) {
        console.error("Error en API:", error);
        throw error;
    }
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    // Asegura que vuelva al login sin importar si está en admin o portería
    window.location.href = "login.html";
}