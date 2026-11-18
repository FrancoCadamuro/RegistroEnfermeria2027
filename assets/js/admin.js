// Lógica Dashboard Admin
// Utiliza funciones de api.js y utils.js (deben cargarse antes en el HTML)

let reporteMensualActual = [];
let historialCargado = false;
let historialVisible = false;

init();

async function init() {
    try {
        const usuario = obtenerUsuarioLogueado();
        if (!usuario || usuario.rol !== "ADMIN") {
            window.location.href = "./login.html";
            return;
        }

        document.getElementById("usuario").innerText = `${usuario.nombre} (${usuario.rol})`;

        prepararHistorial();
        prepararExportacion();

        actualizarReloj();
        setInterval(actualizarReloj, 1000);

        await cargarDashboard();

        // AUTO REFRESH optimizado: 60 segundos para evitar Rate Limit y bloqueos
        setInterval(async () => {
            console.log("Actualizando dashboard...");
            await cargarDashboard();
        }, 60000);

        await cargarReporteMensual();

    } catch (error) {
        console.error("ERROR INIT:", error);
    }
}

async function cargarDashboard() {
    try {
        const [data, resumenData] = await Promise.all([
            apiFetch("?action=dashboard"),
            apiFetch("?action=resumenHoy")
        ]);

        renderCards(data, resumenData);
        renderPresentes(data.jornadasAbiertas);
        renderMovimientos(data.registrosHoy);
        renderResumen(resumenData);
    } catch(error) {
        console.error("ERROR DASHBOARD:", error);
    }
}

function renderCards(data, resumen) {
    const ingresos = data.registrosHoy.filter(r => r.tipo === "ingreso").length;
    const egresos = data.registrosHoy.filter(r => r.tipo === "egreso").length;

    document.getElementById("cardPresentes").innerText = data.jornadasAbiertas.length;
    document.getElementById("cardIngresos").innerText = ingresos;
    document.getElementById("cardEgresos").innerText = egresos;
    document.getElementById("cardAbiertas").innerText = data.jornadasAbiertas.length;

    const totalMinutos = resumen.reduce((acc, p) => acc + p.minutos, 0);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    document.getElementById("cardHoras").innerText = `${horas}h ${minutos}m`;
}

function renderPresentes(presentes) {
    const tabla = document.getElementById("tablaPresentes");
    tabla.innerHTML = "";
    presentes.forEach(p => {
        tabla.innerHTML += `<tr><td>${p.apellido} ${p.nombre}</td><td>${p.dni}</td><td>${p.horaIngreso}</td></tr>`;
    });
}

function renderMovimientos(movimientos) {
    const tabla = document.getElementById("tablaMovimientos");
    tabla.innerHTML = "";
    movimientos.slice(0, 10).forEach(registro => {
        tabla.innerHTML += `
        <tr>
            <td>${registro.hora}</td>
            <td>${registro.apellido} ${registro.nombre}</td>
            <td>${generarBadgeMovimiento(registro.tipo)}</td>
        </tr>`;
    });
}

function renderResumen(resumen) {
    const tabla = document.getElementById("tablaResumen");
    tabla.innerHTML = "";
    resumen.forEach(p => {
        tabla.innerHTML += `<tr><td>${p.apellido} ${p.nombre}</td><td>${p.jornadas}</td><td>${p.horasTexto}</td></tr>`;
    });
}

async function cargarHistorial() {
    try {
        const buscar = document.getElementById("buscarHistorial").value.trim();
        const fechaInput = document.getElementById("fechaHistorial").value;
        let fecha = "";

        if (fechaInput) {
            const partes = fechaInput.split("-");
            fecha = `${partes[2]}/${partes[1]}/${partes[0]}`;
        }

        const data = await apiFetch(`?action=historial&fecha=${fecha}&buscar=${buscar}`);
        renderHistorial(data);
    } catch(error) {
        console.error("ERROR HISTORIAL:", error);
    }
}

function renderHistorial(historial) {
    const tabla = document.getElementById("tablaHistorial");
    tabla.innerHTML = "";
    if (!historial.length) {
        tabla.innerHTML = `<tr><td colspan="4">Sin movimientos para mostrar</td></tr>`;
        return;
    }
    historial.forEach(registro => {
        tabla.innerHTML += `
        <tr>
            <td>${registro.fecha}</td>
            <td>${registro.hora}</td>
            <td>${registro.apellido} ${registro.nombre}</td>
            <td>${generarBadgeMovimiento(registro.tipo)}</td>
        </tr>`;
    });
}

function actualizarReloj() {
    document.getElementById("reloj").innerText = obtenerHoraActual();
}

async function cargarReporteMensual() {
    try {
        const mes = document.getElementById("mesReporte").value;
        const anio = document.getElementById("anioReporte").value;
        const data = await apiFetch(`?action=reporteMensual&mes=${mes}&anio=${anio}`);
        reporteMensualActual = data;
        renderReporteMensual(data);
    } catch(error) {
        console.error("ERROR REPORTE:", error);
    }
}

function renderReporteMensual(data) {
    const tabla = document.getElementById("tablaReporte");
    tabla.innerHTML = "";
    if (!data.length) {
        tabla.innerHTML = `<tr><td colspan="3">Sin registros</td></tr>`;
        return;
    }
    data.forEach(persona => {
        tabla.innerHTML += `<tr><td>${persona.apellido} ${persona.nombre}</td><td>${persona.jornadas}</td><td>${persona.horasTexto}</td></tr>`;
    });
}

function prepararHistorial() {
    const contenido = document.getElementById("historialContenido");
    const botonToggle = document.getElementById("btnToggleHistorial");
    const botonBuscar = document.getElementById("btnBuscar");

    if (contenido) contenido.classList.add("hidden");

    if (botonToggle) {
        botonToggle.addEventListener("click", async () => {
            historialVisible = !historialVisible;
            contenido.classList.toggle("hidden", !historialVisible);
            botonToggle.innerText = historialVisible ? "Ocultar historial" : "Ver historial";

            if (historialVisible && !historialCargado) {
                await cargarHistorial();
                historialCargado = true;
            }
        });
    }

    if (botonBuscar) {
        botonBuscar.addEventListener("click", async () => {
            if (contenido && contenido.classList.contains("hidden")) {
                contenido.classList.remove("hidden");
                historialVisible = true;
                if (botonToggle) botonToggle.innerText = "Ocultar historial";
            }
            await cargarHistorial();
            historialCargado = true;
        });
    }
}

function prepararExportacion() {
    const botonReporte = document.getElementById("btnReporte");
    const botonExportar = document.getElementById("btnExportar");
    if (botonReporte) botonReporte.addEventListener("click", cargarReporteMensual);
    if (botonExportar) botonExportar.addEventListener("click", exportarReporteMensual);
}

function exportarReporteMensual() {
    if (!reporteMensualActual.length) {
        alert("No hay datos para exportar. Primero genera el reporte.");
        return;
    }
    const mes = document.getElementById("mesReporte").value;
    const anio = document.getElementById("anioReporte").value;
    const filas = [["DNI", "Apellido", "Nombre", "Jornadas", "Minutos", "Horas"]];

    reporteMensualActual.forEach(p => {
        filas.push([p.dni, p.apellido, p.nombre, p.jornadas, p.minutos, p.horasTexto]);
    });

    const csv = filas.map(f => f.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-mensual-${anio}-${String(mes).padStart(2, "0")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}