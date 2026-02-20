// ==========================================
// 1. ESTADO GLOBAL Y CONFIGURACIÓN
// ==========================================
window.myLibrary = JSON.parse(localStorage.getItem('myMangaCloud')) || [];
let rankMilestones = JSON.parse(localStorage.getItem('systemMilestones')) || {};
let dailyStreak = JSON.parse(localStorage.getItem('dailyStreak')) || { count: 0, lastDate: null };
let titulosObtenidos = JSON.parse(localStorage.getItem('titulosObtenidos')) || [];
let petStatus = JSON.parse(localStorage.getItem('petStatus')) || { energy: 100, lastCheck: Date.now() };
let logrosObtenidos = JSON.parse(localStorage.getItem('logros_sistema')) || [];

let selectedImage = "";
let editingIndex = -1;
let lastRankName = localStorage.getItem('last_known_rank') || null;
window.selectedImage = "";

// NUEVO: INVENTARIO Y ECONOMÍA
let inventory = JSON.parse(localStorage.getItem('system_inventory')) || { potions: 0, totalQuestsDone: 0 };
let systemGold = parseInt(localStorage.getItem('system_gold')) || 0;

// ESTADO DE MEJORAS DE AURA (TIENDA DE SOMBRAS)
let auraSettings = JSON.parse(localStorage.getItem('aura_settings')) || {
    color: '#00d4ff', // Cian por defecto
    density: 400,     // Intervalo de aparición (ms)
    level: 1          // Nivel de intensidad
};

// ESTADO DE MISIONES
let dailyQuest = JSON.parse(localStorage.getItem('dailyQuest')) || {
    date: null,
    target: 0,
    progress: 0,
    completed: false
};

// ==========================================
// 2. SISTEMA DE NOTIFICACIONES ÉPICAS (CON GLITCH)
// ==========================================
function mostrarNotificacionRango(rango) {
    const overlay = document.createElement('div');
    overlay.className = 'system-notification-overlay';
    overlay.innerHTML = `
        <div class="notification-card rank-glitch">
            <div class="notification-header">ALERTA DEL SISTEMA</div>
            <div class="notification-body">
                <p>SE HA DETECTADO UNA EVOLUCIÓN EN EL CAZADOR</p>
                <h2 class="rank-up-text">${rango}</h2>
                <div class="divider"></div>
                <small>Tus estadísticas han sido actualizadas.</small>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="confirm-btn">CONFIRMAR</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// ==========================================
// 3. BUSCADOR EN TIEMLE REAL
// ==========================================
window.filtrarManhwas = function(query) {
    const term = query.toLowerCase();
    const filtrados = window.myLibrary.filter(m => 
        m.title.toLowerCase().includes(term) || 
        (m.genres && m.genres.toLowerCase().includes(term))
    );
    render(filtrados);
};

// ==========================================
// 4. SISTEMA DE LOGROS Y TÍTULOS DINÁMICOS
// ==========================================
function verificarLogros() {
    const totalCaps = window.myLibrary.reduce((acc, m) => acc + (parseInt(m.current) || 0), 0);
    const hitos = [
        { id: 'logro_10', limite: 10, nombre: "Novato del Sistema", desc: "Has superado los 10 capítulos leídos.", icono: "🥉" },
        { id: 'logro_100', limite: 100, nombre: "Cazador Dedicado", desc: "100 capítulos completados. ¡Sigue así!", icono: "🥈" },
        { id: 'logro_500', limite: 500, nombre: "Berserker de Lectura", desc: "Has devorado 500 capítulos.", icono: "🥇" },
        { id: 'logro_1000', limite: 1000, nombre: "Soberano de las Sombras", desc: "¡1000 capítulos! Eres el Monarca de este sistema.", icono: "💎" }
    ];

    hitos.forEach(logro => {
        if (totalCaps >= logro.limite && !logrosObtenidos.includes(logro.id)) {
            logrosObtenidos.push(logro.id);
            localStorage.setItem('logros_sistema', JSON.stringify(logrosObtenidos));
            notificarLogro(logro);
        }
    });

    verificarLogroAutor(); 
    renderizarSalaDeTrofeos(hitos);
}

function verificarLogroAutor() {
    const autores = {};
    window.myLibrary.forEach(m => {
        if (m.author && m.author !== "Desconocido") {
            autores[m.author] = (autores[m.author] || 0) + 1;
        }
    });

    for (const [autor, cantidad] of Object.entries(autores)) {
        const idLogro = `autor_${autor.replace(/\s/g, '_')}`;
        if (cantidad >= 5 && !logrosObtenidos.includes(idLogro)) {
            logrosObtenidos.push(idLogro);
            localStorage.setItem('logros_sistema', JSON.stringify(logrosObtenidos));
            notificarLogro({
                nombre: "LEGADO ETERNO",
                desc: `Has coleccionado 5 obras del autor: ${autor}`
            });
        }
    }
}

function actualizarTituloYApariencia() {
    const tituloEl = document.getElementById('player-title');
    if (!tituloEl || window.myLibrary.length === 0) return;

    const forcedEyes = localStorage.getItem('forced_eye_color');
    const conteo = {};
    window.myLibrary.forEach(m => {
        if (m.genres) {
            m.genres.split(',').forEach(g => {
                const gen = g.trim().toLowerCase();
                if(gen) conteo[gen] = (conteo[gen] || 0) + 1;
            });
        }
    });

    const sortedGenres = Object.entries(conteo).sort((a,b) => b[1] - a[1]);
    if (sortedGenres.length > 0) {
        const [topGenre, cantidad] = sortedGenres[0];
        let rangoTitulo = "INICIADO";
        let eyeColor = forcedEyes || "variant01"; 

        if (cantidad >= 3) {
            rangoTitulo = `MONARCA DE ${topGenre.toUpperCase()}`;
            if (!forcedEyes) {
                if (topGenre.includes("acción")) eyeColor = "variant10"; 
                if (topGenre.includes("romance")) eyeColor = "variant05"; 
                if (topGenre.includes("comedia")) eyeColor = "variant02"; 
            }
        }
        
        tituloEl.innerText = rangoTitulo;
        localStorage.setItem('cached_eye_color', eyeColor);
    }
}

function renderizarSalaDeTrofeos(hitos) {
    const container = document.getElementById('achievements-display-list');
    if (!container) return;
    container.innerHTML = hitos.map(l => `
        <div class="achievement-slot ${logrosObtenidos.includes(l.id) ? 'unlocked' : ''}">
            <span class="achievement-icon">${l.icono}</span>
            <span style="display:block; margin-top:5px">${l.nombre.split(' ')[0]}</span>
        </div>
    `).join('');
}

function notificarLogro(logro) {
    const pop = document.createElement('div');
    pop.className = 'achievement-popup';
    pop.innerHTML = `
        <div style="color:#ffd700; font-family:'Orbitron'; font-size:0.6rem;">¡LOGRO DESBLOQUEADO!</div>
        <div style="font-weight:bold;">🏆 ${logro.nombre}</div>
        <div style="font-size:0.7rem; color:#ccc;">${logro.desc}</div>
    `;
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 5000);
}

// ==========================================
// 5. ECONOMÍA Y MERCADO NEGRO
// ==========================================
function ganarOro(caps) {
    const ganancia = caps * 10;
    systemGold += ganancia;
    localStorage.setItem('system_gold', systemGold);
    actualizarDisplayOro();
}

function actualizarDisplayOro() {
    const oroEl = document.getElementById('gold-display');
    if (oroEl) oroEl.innerText = systemGold;
}

window.comprarObjeto = function(tipo, precio) {
    if (systemGold >= precio) {
        systemGold -= precio;
        localStorage.setItem('system_gold', systemGold);
        
        if (tipo === 'pocion') {
            inventory.potions += 1;
            localStorage.setItem('system_inventory', JSON.stringify(inventory));
        } else if (tipo === 'cambio_clase') {
            const nuevoColor = prompt("Elige color (blue, red, gold, purple, green):", "gold");
            const map = { 'blue':'variant01', 'red':'variant05', 'gold':'variant10', 'purple':'variant08', 'green':'variant03' };
            localStorage.setItem('forced_eye_color', map[nuevoColor] || 'variant10');
        }

        actualizarDisplayOro();
        renderInventario();
        renderMercadoNegro();
        actualizarAvatarMascota();
        ejecutarFlashSistema();
        alert("¡Adquisición completada!");
    } else {
        alert("Oro insuficiente. Sigue limpiando mazmorras (leyendo).");
    }
};

function renderMercadoNegro() {
    const container = document.getElementById('black-market-container');
    if (!container) return;
    container.innerHTML = `
        <div class="system-card-gold" style="margin-top:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="color:#ffd700; margin:0; font-size:0.8rem; font-family:'Orbitron';">MERCADO NEGRO</h4>
                <div style="color:#ffd700; font-weight:bold; font-size:0.9rem;">💰 <span id="gold-display">${systemGold}</span></div>
            </div>
            <div class="black-market-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="shop-item" style="background:rgba(255,255,255,0.03); border:1px solid #444; padding:8px; text-align:center;">
                    <div style="font-size:1.2rem;">🧪</div>
                    <div style="font-size:0.6rem; color:#eee;">Poción Energía</div>
                    <button onclick="comprarObjeto('pocion', 100)" style="font-size:0.5rem; margin-top:5px; background:#ffd700; color:black; border:none; padding:3px 6px; cursor:pointer; font-weight:bold;">100 ORO</button>
                </div>
                <div class="shop-item" style="background:rgba(255,255,255,0.03); border:1px solid #444; padding:8px; text-align:center;">
                    <div style="font-size:1.2rem;">👁️</div>
                    <div style="font-size:0.6rem; color:#eee;">Cambio Clase</div>
                    <button onclick="comprarObjeto('cambio_clase', 500)" style="font-size:0.5rem; margin-top:5px; background:#ffd700; color:black; border:none; padding:3px 6px; cursor:pointer; font-weight:bold;">500 ORO</button>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 6. MISIONES DIARIAS
// ==========================================
function generarMisionDiaria() {
    const hoy = new Date().toDateString();
    if (dailyQuest.date !== hoy) {
        dailyQuest = {
            date: hoy,
            target: Math.floor(Math.random() * 8) + 3,
            progress: 0,
            completed: false
        };
        localStorage.setItem('dailyQuest', JSON.stringify(dailyQuest));
    }
    renderMision();
}

function renderMision() {
    const container = document.getElementById('quest-container');
    if (!container) return;
    const status = dailyQuest.completed ? 
        `<span style="color:#4caf50; text-shadow: 0 0 5px #4caf50;">[COMPLETADA]</span>` : 
        `<span style="color:var(--neon-blue)">PROGRESO: ${dailyQuest.progress} / ${dailyQuest.target}</span>`;

    container.innerHTML = `
        <div class="system-card-blue" style="margin:10px 0;">
            <div style="color:#00d4ff; font-family:'Orbitron'; font-size:0.7rem; letter-spacing:1px;">MISIÓN DIARIA</div>
            <p style="font-size:0.7rem; margin:3px 0; color:#eee;">Objetivo: Lee ${dailyQuest.target} capítulos nuevos.</p>
            <div style="font-size:0.65rem; font-weight:bold;">${status}</div>
        </div>
    `;
}

function actualizarProgresoMision(capsLeidos) {
    if (dailyQuest.completed || capsLeidos <= 0) return;
    dailyQuest.progress += capsLeidos;
    if (dailyQuest.progress >= dailyQuest.target) {
        dailyQuest.completed = true;
        notificarLogro({ nombre: "MISIÓN CUMPLIDA", desc: "Has ganado +50 XP y una recompensa de inventario." });
        reclamarRecompensaMision();
    }
    localStorage.setItem('dailyQuest', JSON.stringify(dailyQuest));
    renderMision();
}

// ==========================================
// 7. GESTIÓN DE INVENTARIO
// ==========================================
function reclamarRecompensaMision() {
    inventory.totalQuestsDone += 1;
    if (inventory.totalQuestsDone % 5 === 0) {
        inventory.potions += 1;
        notificarLogro({ 
            nombre: "RECOMPENSA DE SUMINISTROS", 
            desc: "¡Has obtenido una [Poción de Energía] por tu constancia!" 
        });
    }
    localStorage.setItem('system_inventory', JSON.stringify(inventory));
    renderInventario();
}

window.usarPocion = function() {
    if (inventory.potions > 0) {
        inventory.potions -= 1;
        petStatus.energy = 100;
        petStatus.lastCheck = Date.now();
        localStorage.setItem('petStatus', JSON.stringify(petStatus));
        localStorage.setItem('system_inventory', JSON.stringify(inventory));
        ejecutarFlashSistema();
        actualizarVitalidad();
        actualizarAvatarMascota();
        renderInventario();
        alert("🧪 ¡POCIÓN UTILIZADA! Vitalidad al 100%.");
    }
};

function renderInventario() {
    const container = document.getElementById('inventory-container');
    if (!container) return;
    container.innerHTML = `
        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; border:1px solid #444; margin-top:10px;">
            <div style="color:#ffd700; font-family:'Orbitron'; font-size:0.65rem; margin-bottom:8px;">INVENTARIO</div>
            <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="font-size:1.2rem;" class="${inventory.potions > 0 ? 'rare-item' : ''}">🧪</div>
                    <div>
                        <div style="font-size:0.7rem; font-weight:bold; color:#eee;">Poción de Energía</div>
                        <div style="font-size:0.6rem; color:#aaa;">Stock: ${inventory.potions}</div>
                    </div>
                </div>
                <button onclick="window.usarPocion()" 
                    style="background:${inventory.potions > 0 ? '#4caf50' : '#333'}; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.6rem; cursor:pointer;"
                    ${inventory.potions === 0 ? 'disabled' : ''}>USAR</button>
            </div>
            <div style="font-size:0.5rem; color:#555; margin-top:5px;">Misiones para sig. poción: ${5 - (inventory.totalQuestsDone % 5)}</div>
        </div>
    `;
}

// ==========================================
// 8. ESTADÍSTICAS Y VITALIDAD
// ==========================================
function actualizarEstadisticasGeneros() {
    const container = document.getElementById('genre-stats-container');
    if (!container) return;

    const conteo = {};
    window.myLibrary.forEach(m => {
        if (m.genres) {
            const lista = m.genres.split(',').map(g => g.trim());
            lista.forEach(g => { if(g) conteo[g] = (conteo[g] || 0) + 1; });
        }
    });

    const sorted = Object.entries(conteo).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

    container.innerHTML = sorted.length > 0 ? sorted.map(([genero, cantidad]) => `
        <div style="margin-bottom:12px">
            <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:4px; font-family:'Rajdhani'; font-weight:700;">
                <span>${genero.toUpperCase()}</span>
                <span style="color:var(--neon-blue)">${cantidad} REGISTROS</span>
            </div>
            <div class="chart-bar-bg" style="background:rgba(255,255,255,0.1); height:6px; border-radius:3px;">
                <div class="chart-bar-fill" style="width: ${(cantidad / maxVal) * 100}%; background:linear-gradient(90deg, #00d4ff, #0055ff); height:100%; border-radius:3px; box-shadow: 0 0 10px #00d4ffaa;"></div>
            </div>
        </div>
    `).join('') : '<p style="font-size:0.7rem; color:#666; text-align:center;">Analizando patrones de lectura...</p>';
}

function actualizarVitalidad() {
    const ahora = Date.now();
    const horasTranscurridas = (ahora - petStatus.lastCheck) / (1000 * 60 * 60);
    
    if (horasTranscurridas >= 1) {
        petStatus.energy -= Math.floor(horasTranscurridas * 5);
        if (petStatus.energy < 0) petStatus.energy = 0;
        petStatus.lastCheck = ahora;
        localStorage.setItem('petStatus', JSON.stringify(petStatus));
    }

    const energyFill = document.getElementById('energy-fill');
    if (energyFill) {
        energyFill.style.width = `${petStatus.energy}%`;
        energyFill.style.backgroundColor = petStatus.energy < 30 ? "#ff4d4d" : "#4caf50";
    }
}

function alimentarMascota(capsLeidos) {
    ganarOro(capsLeidos); 
    petStatus.energy += (capsLeidos * 2);
    if (petStatus.energy > 100) petStatus.energy = 100;
    petStatus.lastCheck = Date.now();
    localStorage.setItem('petStatus', JSON.stringify(petStatus));
    actualizarAvatarMascota();
    actualizarProgresoMision(capsLeidos); 
}

function actualizarAvatarMascota() {
    const avatarImg = document.getElementById('user-avatar');
    if (!avatarImg) return;

    const totalCaps = window.myLibrary.reduce((acc, m) => acc + (parseInt(m.current) || 0), 0);
    const totalXP = totalCaps + (dailyStreak.count * 10);
    const playerName = document.getElementById('player-name')?.innerText || 'Cazador';
    
    let outfit = "none";
    if (totalXP >= 300) outfit = "shirt";
    if (totalXP >= 700) outfit = "tactical";
    if (totalXP >= 1500) outfit = "suit";
    if (totalXP >= 3000) outfit = "knightArmor";

    let eyes = localStorage.getItem('cached_eye_color') || "variant01";
    if (petStatus.energy < 30) eyes = "variant05"; 

    avatarImg.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${playerName}&extraTraits=${outfit}&eyes=${eyes}&backgroundColor=b6e3f4,c0aede`;
}

// ==========================================
// 9. SISTEMA DE SOMBRAS INVOCADAS (RASTREADOR)
// ==========================================
window.toggleSombra = function(index) {
    const m = window.myLibrary[index];
    m.isShadow = !m.isShadow;
    localStorage.setItem('myMangaCloud', JSON.stringify(window.myLibrary));
    
    if (m.isShadow) {
        reproducirSonidoInvocacion();
        notificarLogro({ nombre: "SURGE...", desc: `Has extraído la sombra de ${m.title}` });
    }
    
    window.cerrarDetalles();
    render();
    if (!document.getElementById('pane-profile').classList.contains('hidden')) {
        renderSombrasInvocadas();
    }
};

function renderSombrasInvocadas() {
    const container = document.getElementById('shadows-army-container');
    if (!container) return;

    const sombras = window.myLibrary.filter(m => m.isShadow);
    container.innerHTML = sombras.map((s, i) => {
        const angle = (i / sombras.length) * (Math.PI * 2);
        const radius = 95; 
        const x = Math.cos(angle) * radius + 95; 
        const y = Math.sin(angle) * radius + 75;

        return `
            <div class="shadow-wraith" 
                 style="background-image: url('${s.img}'); 
                        left: ${x}px; top: ${y}px; 
                        animation-delay: ${i * 0.5}s;">
            </div>
        `;
    }).join('');
}

function reproducirSonidoInvocacion() {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
}

// ==========================================
// 10. IMPORTAR / EXPORTAR
// ==========================================
window.exportarDatosCazador = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.myLibrary));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_cazador.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

window.importarDatosCazador = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            window.myLibrary = json;
            localStorage.setItem('myMangaCloud', JSON.stringify(window.myLibrary));
            ejecutarFlashSistema();
            setTimeout(() => location.reload(), 500);
        } catch (err) {
            alert("Error: El archivo de alma está corrupto.");
        }
    };
    reader.readAsText(file);
};

// ==========================================
// 11. CONTROL DE INTERFAZ
// ==========================================
window.toggleInterfaz = function() {
    const panel = document.getElementById('panel-interfaz');
    if (!panel) return;
    
    if (!document.getElementById('btn-close-system')) {
        const btnClose = document.createElement('button');
        btnClose.id = 'btn-close-system';
        btnClose.innerHTML = 'VOLVER';
        btnClose.style = "position:absolute; top:15px; right:15px; background:rgba(255,0,0,0.2); border:1px solid #ff4d4d; color:#ff4d4d; padding:5px 12px; cursor:pointer; font-family:'Orbitron'; font-size:0.6rem;";
        btnClose.onclick = window.toggleInterfaz;
        panel.appendChild(btnClose);
    }

    const isActive = panel.classList.contains('active');
    if (isActive) {
        panel.classList.remove('active');
        panel.style.display = "none";
    } else {
        ejecutarFlashSistema();
        panel.style.display = "block";
        setTimeout(() => panel.classList.add('active'), 10);
    }
};

window.cambiarFondo = function(tipo) {
    ejecutarFlashSistema(); 
    const body = document.body;
    body.classList.remove('bg-sakura', 'bg-vacio', 'bg-neon', 'bg-stars', 'bg-dungeon');
    
    const backgrounds = {
        'sakura': "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url('https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=2076')",
        'dungeon': "linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.9)), url('https://images.unsplash.com/photo-1519074063912-ad2d6d51dd2d?q=80&w=1974')",
        'stars': "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url('https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2050')",
        'neon': "radial-gradient(circle, #001f3f, #000000)",
        'vacio': "#000000",
        'default': "linear-gradient(135deg, #0a0a0a, #1a1a1a)"
    };

    setTimeout(() => {
        body.style.background = backgrounds[tipo] || backgrounds['default'];
        body.style.backgroundSize = "cover";
        body.style.backgroundAttachment = "fixed";
        localStorage.setItem('sistema_fondo_preferido', tipo);
    }, 100);
};
window.switchPane = (id) => {
    document.querySelectorAll('.pane').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetPane = document.getElementById('pane-' + id);
    if (targetPane) targetPane.classList.remove('hidden');
    
    const btn = document.getElementById('nav-' + id);
    if (btn) btn.classList.add('active');
    
    if (id === 'profile') {
        actualizarAvatarMascota();
        actualizarVitalidad();
        actualizarEstadisticasGeneros();
        actualizarTituloYApariencia();
        renderMision();
        renderInventario();
        renderMercadoNegro();
        renderSombrasInvocadas(); 
        verificarLogros();
        const currentRank = document.getElementById('rank-display')?.innerText || 'RANGO E';
        actualizarAspectoPorRango(currentRank);
    }
};

function actualizarAspectoPorRango(rango) {
    const avatar = document.getElementById('user-avatar');
    const aura = document.getElementById('avatar-aura-effect');
    const coloresRango = {
        'RANGO E': { color: '#a5a5a5', filtro: 'grayscale(100%)' },
        'RANGO D': { color: '#4caf50', filtro: 'hue-rotate(90deg) brightness(0.9)' },
        'RANGO C': { color: '#00d4ff', filtro: 'none' },
        'RANGO B': { color: '#9c27b0', filtro: 'hue-rotate(250deg) saturate(1.5)' },
        'RANGO A': { color: '#ff5722', filtro: 'hue-rotate(320deg) contrast(1.2)' },
        'RANGO S': { color: '#ffd700', filtro: 'sepia(0.5) saturate(4) brightness(1.1) drop-shadow(0 0 5px gold)' }
    };
    const estilo = coloresRango[rango] || coloresRango['RANGO E'];
    if (avatar) avatar.style.filter = estilo.filtro;
    if (aura) {
        aura.style.boxShadow = `0 0 25px ${estilo.color}`;
        aura.style.background = `radial-gradient(circle, ${estilo.color}33 0%, transparent 70%)`;
    }
}

// ==========================================
// 12. RENDER BIBLIOTECA
// ==========================================
window.render = function() {
    const container = document.getElementById('manhwa-display');
    const homeCount = document.getElementById('total-count-home');
    if (!container) return;

    container.innerHTML = ""; // Limpiamos pantalla
    if (homeCount) homeCount.innerText = window.myLibrary.length;

    window.myLibrary.forEach((m, index) => {
        const card = document.createElement('div');
        // Si es sombra, añadimos la clase especial
        card.className = `manhwa-card ${m.isShadow ? 'shadow-mode' : ''}`;
        
        // REPARACIÓN DE IMAGEN: Si m.img no existe, ponemos una por defecto
        const fotoUrl = m.img && m.img !== "" ? m.img : "https://via.placeholder.com/150?text=SIN+IMAGEN";

        card.innerHTML = `
            <div class="card-image-container">
                <img src="${fotoUrl}" class="manhwa-img" alt="Portada" onerror="this.src='https://via.placeholder.com/150?text=Error+Carga'">
                ${m.isShadow ? '<div class="shadow-mark">SOMBRA</div>' : ''}
                <div class="card-rating">⭐ ${m.rating || '0'}</div>
            </div>
            <div class="card-details">
                <h3 class="manhwa-title">${m.title}</h3>
                <p class="manhwa-cap">Capítulo: ${m.current} / ${m.total || '?'}</p>
                <div class="card-actions">
                    <button onclick="editarManhwa(${index})" class="btn-edit">📝</button>
                    <button onclick="window.eliminarManhwa(${index})" class="btn-delete">🗑️</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    
    console.log("SISTEMA: Renderizado completado.");
};

function updateStats() {
    const totalManhwas = window.myLibrary.length;
    const totalCaps = window.myLibrary.reduce((acc, m) => acc + (parseInt(m.current) || 0), 0);
    
    if (document.getElementById('stat-total-manhwas')) document.getElementById('stat-total-manhwas').innerText = totalManhwas;
    if (document.getElementById('stat-total-caps')) document.getElementById('stat-total-caps').innerText = totalCaps;

    // Calcular nivel y rango
    const nivel = Math.floor(totalCaps / 50) + 1;
    const xpActual = (totalCaps % 50) * 2; 

    let rango = "RANGO E";
    if (totalCaps >= 100) rango = "RANGO D";
    if (totalCaps >= 300) rango = "RANGO C";
    if (totalCaps >= 700) rango = "RANGO B";
    if (totalCaps >= 1500) rango = "RANGO A";
    if (totalCaps >= 3000) rango = "RANGO S";
    
    if (document.getElementById('rank-display')) document.getElementById('rank-display').innerText = rango;

    if (lastRankName !== null && rango !== lastRankName) {
        ejecutarFlashSistema();
        mostrarNotificacionRango(rango);
    }
    lastRankName = rango;
    localStorage.setItem('last_known_rank', rango);
    
    actualizarAspectoPorRango(rango);
    actualizarTituloYApariencia();
    
    if (document.getElementById('user-level')) document.getElementById('user-level').innerText = nivel;
    if (document.getElementById('xp-fill')) document.getElementById('xp-fill').style.width = `${xpActual}%`;
    
    verificarLogros();
    actualizarEstadisticasGeneros();
}

// ==========================================
// 13. DETALLES Y EDICIÓN (MODIFICADO PARA SOMBRAS)
// ==========================================
window.mostrarDetalles = (index) => {
    const m = window.myLibrary[index];
    editingIndex = index;
    const overlay = document.getElementById('details-overlay');
    const content = document.getElementById('detail-content');

    content.innerHTML = `
        <div class="detail-card-modern">
            <div class="detail-header">
                <img src="${m.img || 'https://via.placeholder.com/150'}" class="detail-img">
                <div class="detail-title-area">
                    <span class="detail-type">${m.type}</span>
                    <h2>${m.title}</h2>
                    <p style="font-size:0.7rem; color:#aaa;">Autor: ${m.author || '---'} | Artista: ${m.artist || '---'}</p>
                </div>
            </div>
            <div class="detail-stats-grid">
                <div class="d-stat"><small>ESTADO</small><span>${m.status}</span></div>
                <div class="d-stat"><small>RATING</small><span>⭐ ${m.rating}</span></div>
            </div>
            <div class="detail-actions">
                <button onclick="toggleSombra(${index})" class="btn-extract ${m.isShadow ? 'is-shadow' : ''}" style="flex:2; background: ${m.isShadow ? '#00d4ff' : 'linear-gradient(45deg, #111, #0055ff)'}; color: ${m.isShadow ? '#000' : '#00d4ff'}; border: 1px solid #00d4ff; padding: 10px; font-family: 'Orbitron'; cursor: pointer; font-size: 0.7rem;">
                    ${m.isShadow ? 'LIBERAR SOMBRA' : 'SURGE (EXTRAER)'}
                </button>
                <button onclick="prepararEdicion(${index})" class="btn-edit">EDITAR</button>
                <button onclick="eliminarManhwa(${index})" class="btn-delete" style="background:#ff4d4d;">ELIMINAR</button>
                <button onclick="cerrarDetalles()" class="btn-close">CERRAR</button>
            </div>
        </div>
    `;
    overlay.classList.remove('hidden');
};

window.cerrarDetalles = () => document.getElementById('details-overlay').classList.add('hidden');

window.eliminarManhwa = (index) => {
    if(confirm("¿Eliminar este registro permanentemente?")) {
        window.myLibrary.splice(index, 1);
        localStorage.setItem('myMangaCloud', JSON.stringify(window.myLibrary));
        cerrarDetalles();
        render();
        updateStats();
    }
};

window.prepararEdicion = (index) => {
    const m = window.myLibrary[index];
    editingIndex = index;
    document.getElementById('input-title').value = m.title;
    document.getElementById('input-author').value = m.author || "";
    document.getElementById('input-artist').value = m.artist || "";
    document.getElementById('input-current-cap').value = m.current;
    document.getElementById('input-total-cap').value = m.total;
    document.getElementById('input-genres').value = m.genres;
    document.getElementById('input-rating').value = m.rating;
    document.getElementById('input-type').value = m.type || "";
    document.getElementById('input-status').value = m.status || "Publicándose";
    selectedImage = m.img;
    cerrarDetalles();
    document.getElementById('form-overlay').classList.remove('hidden');
};

// ==========================================
// 14. PROCESAR GUARDADO
// ==========================================
window.procesarGuardado = function() {
    console.log("SISTEMA: Iniciando guardado..."); // Para ver si el botón responde

    const titleInput = document.getElementById('input-title');
    const currentCapInput = document.getElementById('input-current-cap');

    // Validación básica: Si no hay título, no hace nada
    if(!titleInput || !titleInput.value) { 
        alert("⚠️ ¡ERROR DEL SISTEMA! El título es obligatorio."); 
        return; 
    }

    const capsInput = parseInt(currentCapInput.value) || 0;
    
    // Crear el objeto del Manhwa
    const item = {
        title: titleInput.value,
        author: document.getElementById('input-author')?.value || "Desconocido",
        artist: document.getElementById('input-artist')?.value || "Desconocido",
        current: capsInput,
        total: document.getElementById('input-total-cap')?.value || "?",
        type: document.getElementById('input-type')?.value || "Manhwa",
        demography: document.getElementById('input-demography')?.value || "N/A",
        status: document.getElementById('input-status')?.value || "Publicándose",
        year: document.getElementById('input-year')?.value || "N/A",
        genres: document.getElementById('input-genres')?.value || "",
        rating: document.getElementById('input-rating')?.value || "0",
        // Dentro de procesarGuardado, busca la parte de 'img:' y déjala así:
img: window.selectedImage || (editingIndex > -1 ? window.myLibrary[editingIndex].img : "https://via.placeholder.com/150"),
        isShadow: editingIndex > -1 ? (window.myLibrary[editingIndex].isShadow || false) : false 
    };

    if (editingIndex > -1) {
        // Modo Edición
        const diff = capsInput - window.myLibrary[editingIndex].current;
        if (diff > 0) alimentarMascota(diff);
        window.myLibrary[editingIndex] = item;
        console.log("SISTEMA: Registro actualizado.");
    } else {
        // Modo Nuevo Registro
        alimentarMascota(capsInput);
        window.myLibrary.push(item);
        console.log("SISTEMA: Nuevo registro vinculado.");
    }

    // Guardar en Memoria Local (LocalStorage)
    localStorage.setItem('myMangaCloud', JSON.stringify(window.myLibrary));
    
    // Ocultar formulario y limpiar
    document.getElementById('form-overlay').classList.add('hidden');
    editingIndex = -1;
    selectedImage = "";
    
    // Limpiar campos manualmente
    document.querySelectorAll('.system-input').forEach(i => i.value = "");

    // Refrescar Interfaz
    render();
    updateStats();
    
    alert("✅ DATOS SINCRONIZADOS");
};

// ==========================================
// 15. SISTEMA DE HABILIDADES (SKILL BOOK)
// ==========================================
let habilidadesDesbloqueadas = JSON.parse(localStorage.getItem('habilidades_sistema')) || [];

const PRECIOS_HABILIDADES = {
    'ojo-senor': 500,
    'sed-sangre': 1000
};

window.adquirirHabilidad = function(tipo) {
    if (habilidadesDesbloqueadas.includes(tipo)) {
        if (tipo === 'sed-sangre') activarSedDeSangre();
        else alert("SISTEMA: Habilidad pasiva ya activa.");
        return;
    }

    const precio = PRECIOS_HABILIDADES[tipo];

    if (systemGold >= precio) {
        systemGold -= precio;
        habilidadesDesbloqueadas.push(tipo);
        
        localStorage.setItem('system_gold', systemGold);
        localStorage.setItem('habilidades_sistema', JSON.stringify(habilidadesDesbloqueadas));
        
        ejecutarFlashSistema();
        actualizarDisplayOro();
        actualizarInterfazHabilidades();
        
        notificarLogro({ 
            nombre: "HABILIDAD ADQUIRIDA", 
            desc: `Has despertado el poder: ${tipo.replace('-', ' ').toUpperCase()}` 
        });

    } else {
        alert(`ORO INSUFICIENTE. Necesitas ${precio - systemGold} G adicionales.`);
    }
};

function actualizarInterfazHabilidades() {
    habilidadesDesbloqueadas.forEach(skillId => {
        const idHtml = skillId === 'ojo-senor' ? 'skill-ojo' : 'skill-sed';
        const el = document.getElementById(idHtml);
        if (el) {
            el.classList.remove('locked');
            if (skillId === 'ojo-senor') activarEfectoOjoSenor();
        }
    });
}

function activarEfectoOjoSenor() {
    const conteo = {};
    window.myLibrary.forEach(m => {
        if (m.genres) {
            m.genres.split(',').forEach(g => {
                const gen = g.trim().toLowerCase();
                if(gen) conteo[gen] = (conteo[gen] || 0) + 1;
            });
        }
    });
    const topGenre = Object.entries(conteo).sort((a,b) => b[1] - a[1])[0]?.[0];
    
    document.querySelectorAll('.manhwa-card-modern').forEach((card, index) => {
        const m = window.myLibrary[index];
        if (m && m.genres && m.genres.toLowerCase().includes(topGenre)) {
            card.style.border = "1px solid rgba(0, 242, 255, 0.5)";
            card.style.boxShadow = "0 0 10px rgba(0, 242, 255, 0.2)";
        }
    });
}

let sedDeSangreActiva = false;
// ==========================================
// 16. MODIFICACIÓN DE FUNCIONES EXISTENTES
// ==========================================
const originalGanarOro = window.ganarOro;
window.ganarOro = function(caps) {
    let multiplicador = sedDeSangreActiva ? 2 : 1;
    const ganancia = caps * 10 * multiplicador;
    systemGold += ganancia;
    localStorage.setItem('system_gold', systemGold);
    
    if (document.getElementById('gold-display')) document.getElementById('gold-display').innerText = systemGold;
    if (document.getElementById('player-gold-display')) document.getElementById('player-gold-display').innerText = systemGold;
};

window.ejecutarFlashSistema = function() {
    const flash = document.getElementById('system-flash');
    if (flash) {
        flash.style.opacity = '1';
        setTimeout(() => flash.style.opacity = '0', 300);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    actualizarInterfazHabilidades();
    actualizarDisplayOro();
});

// ==========================================
// 17. EFECTOS VISUALES AVANZADOS (PARTÍCULAS)
// ==========================================
function crearParticulasEspectrales() {
    const anchor = document.getElementById('spectral-anchor');
    if (!anchor) return;

    actualizarEstiloParticulas(); 

    const spawn = () => {
        if (document.querySelectorAll('.shadow-particle').length < (15 * auraSettings.level)) {
            const p = document.createElement('div');
            p.className = 'shadow-particle';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.animationDuration = (Math.random() * 3 + 3) + 's';
            
            if (!sedDeSangreActiva) {
                p.style.background = `linear-gradient(to top, transparent, ${auraSettings.color})`;
                p.style.boxShadow = `0 0 8px ${auraSettings.color}`;
            }

            anchor.appendChild(p);
            setTimeout(() => p.remove(), 6000);
        }
        setTimeout(spawn, auraSettings.density); 
    };
    spawn();
}

window.activarSedDeSangre = function() {
    if (sedDeSangreActiva) {
        alert("SISTEMA: La Sed de Sangre ya está en su apogeo.");
        return;
    }

    if (!habilidadesDesbloqueadas.includes('sed-sangre')) {
        alert("SISTEMA: Habilidad bloqueada. Requiere 1000 G.");
        return;
    }

    sedDeSangreActiva = true;
    document.body.classList.add('blood-mode');
    
    const pulse = document.createElement('div');
    pulse.className = 'blood-aura-pulse';
    document.body.appendChild(pulse);

    reproducirSonidoInvocacion(); 
    notificarLogro({ 
        nombre: "¡MODO BERSERKER!", 
        desc: "Doble ganancia de ORO activada. ¡Caza sin piedad!" 
    });

    setTimeout(() => {
        sedDeSangreActiva = false;
        document.body.classList.remove('blood-mode');
        pulse.remove();
        alert("SISTEMA: La Sed de Sangre se ha enfriado. El multiplicador ha expirado.");
    }, 3600000);
};

document.addEventListener('DOMContentLoaded', () => {
    crearParticulasEspectrales();
});

// ==========================================
// 18. TIENDA DE SOMBRAS (MEJORAS DE AURA)
// ==========================================
window.comprarMejoraAura = function(tipo) {
    const COSTO_MEJORA = auraSettings.level * 300; 

    if (tipo === 'intensidad') {
        if (systemGold >= COSTO_MEJORA) {
            systemGold -= COSTO_MEJORA;
            auraSettings.level += 1;
            auraSettings.density = Math.max(100, auraSettings.density - 50); 
            
            saveAuraSettings();
            alert(`SISTEMA: Intensidad aumentada a Nivel ${auraSettings.level}`);
        } else {
            alert(`ORO INSUFICIENTE: Necesitas ${COSTO_MEJORA} G`);
        }
    }
};

window.cambiarColorAura = function(nuevoColor) {
    const COSTO_COLOR = 1000;
    if (systemGold >= COSTO_COLOR) {
        systemGold -= COSTO_COLOR;
        auraSettings.color = nuevoColor;
        saveAuraSettings();
        actualizarEstiloParticulas();
    } else {
        alert("ORO INSUFICIENTE para transmutar el alma.");
    }
};

function saveAuraSettings() {
    localStorage.setItem('aura_settings', JSON.stringify(auraSettings));
    
    if(document.getElementById('aura-lv')) 
        document.getElementById('aura-lv').innerText = auraSettings.level;
    if(document.getElementById('aura-cost')) 
        document.getElementById('aura-cost').innerText = auraSettings.level * 300;
    
    actualizarDisplayOro();
    actualizarEstiloParticulas();
}

function actualizarEstiloParticulas() {
    document.documentElement.style.setProperty('--aura-custom-color', auraSettings.color);
}

// ==========================================
// 19. RASTREADOR DE SOMBRAS PATRULLANDO (FINAL)
// ==========================================
function invocarPatrullaSombras() {
    const anchor = document.getElementById('spectral-anchor');
    if (!anchor) return;

    setInterval(() => {
        const sombrasDisponibles = window.myLibrary.filter(m => m.isShadow);
        if (sombrasDisponibles.length === 0) return;
        if (document.querySelectorAll('.patrolling-shadow').length > 5) return;

        const randomShadow = sombrasDisponibles[Math.floor(Math.random() * sombrasDisponibles.length)];
        const ghost = document.createElement('div');
        ghost.className = 'patrolling-shadow';
        ghost.style.backgroundImage = `url('${randomShadow.img}')`;
        
        const duration = Math.random() * 15 + 20; 
        ghost.style.animationDuration = duration + 's';
        ghost.style.bottom = (Math.random() * 5) + 'vh'; 
        
        anchor.appendChild(ghost);
        setTimeout(() => ghost.remove(), duration * 1000);
    }, 8000); 
}

document.addEventListener('DOMContentLoaded', () => {
    invocarPatrullaSombras();
    updateStats();
    render();
    generarMisionDiaria();
});
// ==========================================
// 20. CONTROL DE PANTALLA DE CARGA (SPLASH)
// ==========================================
window.addEventListener('load', () => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        // Le damos un pequeño delay para que se vea el efecto épico
        setTimeout(() => {
            splash.style.opacity = '0';
            splash.style.transition = 'opacity 0.5s ease';
            
            // Lo eliminamos del DOM después de la transición
            setTimeout(() => {
                splash.style.display = 'none';
                console.log("SISTEMA: Conexión Neuronal Establecida.");
            }, 500);
        }, 2000); // 2 segundos de carga
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.onclick = window.procesarGuardado;
    }
});
// ==========================================
// ÚNICO EXTRACTOR DE IMÁGENES (GALERÍA)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const inputFile = document.getElementById('input-file');
    
    if (inputFile) {
        inputFile.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const imgElement = new Image();
                    imgElement.src = event.target.result;

                    imgElement.onload = function() {
                        // CREAMOS UN LIENZO PARA "ENCOGER" LA IMAGEN
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 400; // Tamaño ideal para el sistema
                        const scaleSize = MAX_WIDTH / imgElement.width;
                        canvas.width = MAX_WIDTH;
                        canvas.height = imgElement.height * scaleSize;

                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

                        // GUARDAMOS LA IMAGEN COMPRIMIDA
                        window.selectedImage = canvas.toDataURL('image/jpeg', 0.7);
                        console.log("SISTEMA: Imagen de galería comprimida y lista.");
                        inputFile.style.border = "2px solid #00d4ff"; // Brillo azul de éxito
                    };
                };
                reader.readAsDataURL(file);
            }
        };
    }
});