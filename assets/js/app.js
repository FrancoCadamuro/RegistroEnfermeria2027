// Lógica de Portería
// Utiliza funciones de api.js y utils.js (deben cargarse antes en el HTML)

let personal = [];
let registroActual = null;
let peticionEnCurso = false; // Prevención de doble clic

const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("results");
const modal = document.getElementById("confirmModal");
const modalTitle = document.getElementById("modalTitle");
const modalName = document.getElementById("modalName");
const modalDni = document.getElementById("modalDni");
const modalHora = document.getElementById("modalHora");
const cancelBtn = document.getElementById("cancelBtn");
const confirmBtn = document.getElementById("confirmBtn");
const toast = document.getElementById("toast");
const deviceModal = document.getElementById("deviceModal");
const deviceTokenInput = document.getElementById("deviceTokenInput");
const saveDeviceBtn = document.getElementById("saveDeviceBtn");

// Iniciar sistema
init();

async function init() {
    const usuario = obtenerUsuarioLogueado();

    if (!usuario || !usuario.ok || (usuario.rol !== "ADMIN" && usuario.rol !== "PORTERIA")) {
        window.location.href = "./login.html";
        return;
    }

    if (usuario.rol === "PORTERIA" && !obtenerDeviceToken()) {
        mostrarConfiguracionDispositivo();
        return;
    }

    try {
        await cargarPersonal();
    } catch (error) {
        console.error(error);
        mostrarErrorCarga();
    }
}

function obtenerDeviceToken() {
    return localStorage.getItem("deviceTokenPorteria");
}

function guardarDeviceToken(token) {
    localStorage.setItem("deviceTokenPorteria", token);
}

async function cargarPersonal() {
    mostrarCargando();
    try {
        const data = await apiFetch("?action=personal");
        personal = data;
        resultsContainer.innerHTML = "";
        searchInput.focus();
    } catch (error) {
        throw new Error(error.message || "No se pudo cargar personal");
    }
}

searchInput.addEventListener("input", buscarPersonal);
cancelBtn.addEventListener("click", cerrarModal);
confirmBtn.addEventListener("click", confirmarRegistro);
saveDeviceBtn.addEventListener("click", guardarDispositivo);

deviceTokenInput.addEventListener("keydown", event => {
    if (event.key === "Enter") guardarDispositivo();
});

function mostrarConfiguracionDispositivo() {
    resultsContainer.innerHTML = `<p class="empty-message">Este celular necesita autorización para registrar movimientos.</p>`;
    deviceModal.classList.remove("hidden");
    setTimeout(() => deviceTokenInput.focus(), 100);
}

async function guardarDispositivo() {
    const token = deviceTokenInput.value.trim();
    if (!token) {
        mostrarToastGenerico(toast, "Ingresá el código de dispositivo");
        return;
    }
    guardarDeviceToken(token);
    deviceModal.classList.add("hidden");
    await cargarPersonal();
}

function buscarPersonal() {
    const valor = searchInput.value.trim().toLowerCase();
    resultsContainer.innerHTML = "";

    if (valor.length === 0) return;

    const filtrados = personal.filter(persona => {
        const nombreCompleto = `${persona.apellido} ${persona.nombre}`.toLowerCase();
        return (
            String(persona.dni).includes(valor) ||
            persona.apellido.toLowerCase().includes(valor) ||
            persona.nombre.toLowerCase().includes(valor) ||
            nombreCompleto.includes(valor)
        );
    });

    renderizarResultados(filtrados);
}

function renderizarResultados(personas) {
    if (personas.length === 0) {
        resultsContainer.innerHTML = `<p class="empty-message">No se encontraron resultados</p>`;
        return;
    }

    personas.forEach(persona => {
        const ultimoMovimiento = persona.ultimoMovimiento || "egreso";
        const tipoRegistro = ultimoMovimiento === "ingreso" ? "egreso" : "ingreso";
        const textoBoton = tipoRegistro === "ingreso" ? "Registrar ingreso" : "Registrar egreso";
        const claseBoton = tipoRegistro === "ingreso" ? "ingreso-btn" : "egreso-btn";

        const card = document.createElement("div");
        card.className = "person-card";
        card.innerHTML = `
            <div class="person-info">
                <h3>${persona.apellido} ${persona.nombre}</h3>
                <p>DNI: ${persona.dni}</p>
                <span>${persona.cargo}</span>
            </div>
            <button class="register-btn ${claseBoton}">${textoBoton}</button>
        `;

        card.querySelector("button").addEventListener("click", () => {
            abrirModal(persona, tipoRegistro);
        });

        resultsContainer.appendChild(card);
    });
}

function abrirModal(persona, tipo) {
    registroActual = { persona, tipo };
    modalTitle.textContent = `Confirmar ${tipo}`;
    modalName.textContent = `${persona.apellido} ${persona.nombre}`;
    modalDni.textContent = `DNI: ${persona.dni}`;
    modalHora.textContent = obtenerHoraActual();
    modal.classList.remove("hidden");
}

function cerrarModal() {
    modal.classList.add("hidden");
}

async function confirmarRegistro() {
    if (!registroActual || peticionEnCurso) return; // BLOQUEO ANTI DOBLE CLIC

    peticionEnCurso = true;
    confirmBtn.disabled = true;
    confirmBtn.innerText = "Procesando..."; // Feedback visual

    try {
        const usuario = obtenerUsuarioLogueado();
        const deviceToken = obtenerDeviceToken();

        if (usuario.rol === "PORTERIA" && !deviceToken) {
            cerrarModal();
            mostrarConfiguracionDispositivo();
            return;
        }

        const bodyData = {
            dni: registroActual.persona.dni,
            apellido: registroActual.persona.apellido,
            nombre: registroActual.persona.nombre,
            tipo: registroActual.tipo,
            dispositivo: "PORTERIA",
            modo: "NORMAL"
        };

        if (deviceToken) {
            bodyData.deviceToken = deviceToken;
        }

        // POST a través del API centralizada
        const resultado = await apiFetch("", "POST", bodyData);

        if (!resultado.ok) {
            if (resultado.error === "Dispositivo no autorizado") {
                localStorage.removeItem("deviceTokenPorteria");
                cerrarModal();
                mostrarConfiguracionDispositivo();
                throw new Error("Autorización revocada");
            }
            throw new Error(resultado.error || "No se pudo guardar");
        }

        cerrarModal();
        registroActual.persona.ultimoMovimiento = registroActual.tipo;
        mostrarToastGenerico(toast, `${capitalizar(registroActual.tipo)} registrado - ${resultado.hora}`);

        // Recargar silencioso
        const refreshData = await apiFetch("?action=personal");
        personal = refreshData;
        registroActual = null;
        resetPantalla();

    } catch (error) {
        if (error.message !== "Autorización revocada") {
            mostrarToastGenerico(toast, error.message);
        }
    } finally {
        peticionEnCurso = false;
        confirmBtn.disabled = false;
        confirmBtn.innerText = "Confirmar";
    }
}

function resetPantalla() {
    searchInput.value = "";
    resultsContainer.innerHTML = "";
    setTimeout(() => searchInput.focus(), 100);
}

function mostrarCargando() {
    resultsContainer.innerHTML = `<p class="empty-message">Cargando personal...</p>`;
}

function mostrarErrorCarga() {
    resultsContainer.innerHTML = `<p class="empty-message">Error cargando personal</p>`;
}