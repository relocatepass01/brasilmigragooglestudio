// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(registration => console.log('Service Worker registered'))
        .catch(error => console.log('Service Worker registration failed:', error));
}

// -------------------------------------------------------------
// INICIALIZACIÓN DE SUPABASE & GOOGLE OAUTH
// -------------------------------------------------------------
function getSbClient() {
    return window.supabaseClient || (typeof getSupabase === 'function' ? getSupabase() : window.supabase);
}

// App State
const appState = {
    currentQuestion: 0,
    answers: {},
    totalQuestions: 9,
    documents: []
};
const questions = [
    {
        id: 1,
        text: "¿Cuánto tiempo llevas residiendo en Brasil?",
        options: [
            "Menos de 1 año",
            "Entre 1 y 4 años",
            "Entre 4 y 15 años",
            "Más de 15 años"
        ]
    },
    {
        id: 2,
        text: "¿Posees RNE o CRNM (Registro Nacional de Extranjero)?",
        options: [
            "Sí, tengo registro vigente",
            "Sí, pero está vencido",
            "No tengo registro"
        ]
    },
    {
        id: 3,
        text: "¿Hablas portugués?",
        options: [
            "Sí, con fluidez",
            "Nivel intermedio",
            "Nivel básico o nada"
        ]
    },
    {
        id: 4,
        text: "¿Tienes antecedentes penales en Brasil o en tu país de origen?",
        options: [
            "No, registro limpio",
            "Sí, en Brasil",
            "Sí, en mi país de origen"
        ]
    },
    {
        id: 5,
        text: "¿Tienes cónyuge, hijo o padre/madre brasileño?",
        options: [
            "Cónyuge brasileño",
            "Hijo brasileño",
            "Padre o madre brasileño",
            "No"
        ]
    },
    {
        id: 6,
        text: "¿Cuál es tu situación migratoria actual?",
        options: [
            "Residencia temporal vigente",
            "Residencia permanente",
            "Turista / visa temporal corta",
            "Irregular / sin documentación"
        ]
    },
    {
        id: 7,
        text: "¿Puedes demostrar medios de subsistencia (ingresos/empleo) en Brasil?",
        options: [
            "Sí, tengo pruebas",
            "No, no dispongo de pruebas"
        ]
    },
    {
        id: 8,
        text: "¿Tienes familia bajo tu responsabilidad financiera en Brasil?",
        options: [
            "Sí, tengo dependientes",
            "No"
        ]
    },
    {
        id: 9,
        text: "¿Cuál es tu objetivo principal?",
        options: [
            "Obtener la nacionalidad brasileña",
            "Obtener residencia permanente",
            "Obtener o renovar residencia temporal",
            "Regularizar mi situación migratoria"
        ]
    }
];

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    setupGoogleAuth();
    setupNavigation();
    setupUploadArea();
    setupProfileForm();
    setupDocumentForm();
    loadDocumentsFromStorage();
    
    // Verificar si el usuario viene de autenticarse tras completar el diagnóstico
    const pendingAnswers = localStorage.getItem('pending_diagnostic_answers');
    const pendingAction = localStorage.getItem('pending_diagnostic_action');
    const usuarioId = localStorage.getItem('usuario_id');
    const token = localStorage.getItem('token_sesion');
    const sesionValida = (typeof verificarSesion === 'function' ? verificarSesion() : null) || (usuarioId && token);

    if (pendingAction === 'show_result' && pendingAnswers && sesionValida) {
        localStorage.removeItem('pending_diagnostic_action');
        try {
            appState.answers = JSON.parse(pendingAnswers);
        } catch (e) {
            console.error('Error parseando respuestas:', e);
        }
        showSection('diagnostico');
        showDiagnosticResult();
    } else {
        showSection('inicio');
    }
});

// -------------------------------------------------------------
// CONTROLADOR DE ACCESO: INICIAR SESIÓN Y REGISTRO
// -------------------------------------------------------------
function switchAuthTab(tab) {
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegBtn = document.getElementById('tabRegBtn');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');

    if (!formLogin || !formRegister) return;

    if (tab === 'login') {
        tabLoginBtn?.classList.add('active');
        tabRegBtn?.classList.remove('active');
        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
    } else {
        tabRegBtn?.classList.add('active');
        tabLoginBtn?.classList.remove('active');
        formRegister.style.display = 'block';
        formLogin.style.display = 'none';
    }
}
window.switchAuthTab = switchAuthTab;

async function handleLoginFormSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const email = document.getElementById('authLoginEmail')?.value?.trim();
    const password = document.getElementById('authLoginPassword')?.value;

    if (!email || !password) {
        alert('Por favor, ingresa tu correo electrónico y tu contraseña.');
        return;
    }

    if (typeof loginUsuario === 'function') {
        await loginUsuario(email, password);
    } else {
        alert('✅ Sesión iniciada para ' + email);
        window.location.href = 'dashboard.html';
    }
}
window.handleLoginFormSubmit = handleLoginFormSubmit;

async function handleRegisterFormSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nombre = document.getElementById('authRegNombre')?.value?.trim();
    const email = document.getElementById('authRegEmail')?.value?.trim();
    const password = document.getElementById('authRegPassword')?.value;

    if (!nombre || !email || !password) {
        alert('Por favor, completa todos los campos para registrarte.');
        return;
    }

    if (typeof registroUsuario === 'function') {
        const ok = await registroUsuario(email, password, nombre);
        if (ok) {
            switchAuthTab('login');
        }
    } else {
        alert('✅ Cuenta creada exitosamente para ' + nombre);
        switchAuthTab('login');
    }
}
window.handleRegisterFormSubmit = handleRegisterFormSubmit;

// -------------------------------------------------------------
// LÓGICA DEL BOTÓN DE GOOGLE
// -------------------------------------------------------------
function setupGoogleAuth() {
    // Busca botones con clase o ID de Google para enganchar la acción
    const btnsGoogle = document.querySelectorAll('#btnGoogle, .btn-google, .btn-google-auth, [data-auth="google"]');
    
    btnsGoogle.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            if (typeof loginConGoogle === 'function') {
                await loginConGoogle();
                return;
            }

            const supabaseClient = getSbClient();
            if (!supabaseClient) {
                console.error('Supabase no está inicializado.');
                alert('Iniciando sesión con Google...');
                return;
            }

            try {
                const { data, error } = await supabaseClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + '/dashboard.html'
                    }
                });

                if (error) {
                    console.error('Error Google Auth:', error.message);
                    alert('Error al conectar con Google: ' + error.message);
                }
            } catch (err) {
                console.error('Error inesperado:', err);
            }
        });
    });
}

// Navigation Setup
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const section = this.getAttribute('data-section');
            if (!section) {
                // Permite la navegación normal para enlaces como admin.html
                return;
            }
            e.preventDefault();
            showSection(section);
        });
    });

    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('¿Está seguro de que desea cerrar sesión?')) {
                alert('Sesión cerrada. ¡Hasta luego!');
            }
        });
    }
}

// Show Section
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    const navItems = document.querySelectorAll('.nav-item');

    sections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none'; // Asegura ocultar secciones
    });
    
    navItems.forEach(item => item.classList.remove('active'));

    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active');
        activeSection.style.display = 'block';
    }

    const activeNavItems = document.querySelectorAll(`[data-section="${sectionId}"]`);
    activeNavItems.forEach(item => item.classList.add('active'));

    // Cargar cuestionario si es diagnóstico
    if (sectionId === 'diagnostico') {
        loadQuestionnaire();
    }

    window.scrollTo(0, 0);
}

// Load Questionnaire
function loadQuestionnaire() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;

    container.innerHTML = '';
    const question = questions[appState.currentQuestion];

    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';

    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = `${appState.currentQuestion + 1}. ${question.text}`;

    const options = document.createElement('div');
    options.className = 'question-options';

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'option-button';
        button.textContent = option;
        
        if (appState.answers[appState.currentQuestion] === index) {
            button.classList.add('selected');
        }

        button.addEventListener('click', (e) => {
            e.preventDefault();
            selectAnswer(index);
        });

        options.appendChild(button);
    });

    questionCard.appendChild(questionText);
    questionCard.appendChild(options);
    container.appendChild(questionCard);

    updateProgress();
    updateNavigationButtons();
}

// Select Answer & Feedback Visual
function selectAnswer(index) {
    appState.answers[appState.currentQuestion] = index;
    
    // Marcar rápidamente el botón seleccionado en la interfaz
    const buttons = document.querySelectorAll('.option-button');
    buttons.forEach((btn, idx) => {
        if (idx === index) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

// Update Progress
function updateProgress() {
    const progress = ((appState.currentQuestion + 1) / appState.totalQuestions) * 100;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (progressFill) progressFill.style.width = progress + '%';
    if (progressText) progressText.textContent = Math.round(progress) + '%';
}

// Update Navigation Buttons
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.style.display = appState.currentQuestion > 0 ? 'inline-flex' : 'none';
    }

    if (nextBtn) {
        nextBtn.textContent = (appState.currentQuestion === appState.totalQuestions - 1) ? 'Finalizar y Ver Diagnóstico →' : 'Siguiente →';
    }
}

// Next Question
function nextQuestion() {
    // Validar que el usuario haya seleccionado una respuesta
    if (appState.answers[appState.currentQuestion] === undefined) {
        alert('Por favor selecciona una opción para continuar.');
        return;
    }

    if (appState.currentQuestion < appState.totalQuestions - 1) {
        appState.currentQuestion++;
        loadQuestionnaire();
    } else {
        // Al terminar las preguntas: verificar si ya tiene sesión iniciada
        checkAuthAndShowDiagnosis();
    }
}

// Previous Question
function previousQuestion() {
    if (appState.currentQuestion > 0) {
        appState.currentQuestion--;
        loadQuestionnaire();
    }
}

// Verificación de autenticación obligatoria para ver el resultado
function checkAuthAndShowDiagnosis() {
    // Guardar respuestas para no perderlas
    localStorage.setItem('pending_diagnostic_answers', JSON.stringify(appState.answers));

    const usuarioId = localStorage.getItem('usuario_id');
    const token = localStorage.getItem('token_sesion');
    const sesionValida = (typeof verificarSesion === 'function' ? verificarSesion() : null) || (usuarioId && token);

    if (sesionValida) {
        // Usuario ya registrado e identificado: mostrar resultado directamente
        showDiagnosticResult();
    } else {
        // Usuario no identificado: mostrar pantalla de registro / inicio de sesión obligatorio
        showDiagnosticGate();
    }
}

// Mostrar pantalla de bloqueo / registro obligatorio para diagnóstico
function showDiagnosticGate() {
    const diagnosticoSection = document.getElementById('diagnostico');
    const gateSection = document.getElementById('diagnostico-gate');
    const resultSection = document.getElementById('diagnostico-resultado');

    if (diagnosticoSection) diagnosticoSection.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';

    if (gateSection) {
        gateSection.style.display = 'block';
        gateSection.classList.add('active');
        window.scrollTo({ top: gateSection.offsetTop - 50, behavior: 'smooth' });
    }
}

// Alternar pestañas en la pantalla de bloqueo de diagnóstico
function switchGateAuthTab(tab) {
    const tabRegBtn = document.getElementById('tabGateRegBtn');
    const tabLoginBtn = document.getElementById('tabGateLoginBtn');
    const formReg = document.getElementById('formGateRegister');
    const formLogin = document.getElementById('formGateLogin');

    if (tab === 'register') {
        tabRegBtn?.classList.add('active');
        tabLoginBtn?.classList.remove('active');
        if (formReg) formReg.style.display = 'block';
        if (formLogin) formLogin.style.display = 'none';
    } else {
        tabLoginBtn?.classList.add('active');
        tabRegBtn?.classList.remove('active');
        if (formLogin) formLogin.style.display = 'block';
        if (formReg) formReg.style.display = 'none';
    }
}
window.switchGateAuthTab = switchGateAuthTab;

// Volver al cuestionario desde la pantalla de bloqueo
function volverACuestionario() {
    const gateSection = document.getElementById('diagnostico-gate');
    const diagnosticoSection = document.getElementById('diagnostico');
    if (gateSection) gateSection.style.display = 'none';
    if (diagnosticoSection) {
        diagnosticoSection.style.display = 'block';
        diagnosticoSection.classList.add('active');
    }
    loadQuestionnaire();
    window.scrollTo({ top: diagnosticoSection?.offsetTop - 50 || 0, behavior: 'smooth' });
}
window.volverACuestionario = volverACuestionario;

// Registro desde el paso de diagnóstico
async function handleGateRegisterSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nombre = document.getElementById('gateRegNombre')?.value?.trim();
    const email = document.getElementById('gateRegEmail')?.value?.trim();
    const password = document.getElementById('gateRegPassword')?.value;

    if (!nombre || !email || !password) {
        alert('Por favor completa todos los campos para registrarte.');
        return;
    }

    let registrado = false;
    if (typeof registroUsuario === 'function') {
        registrado = await registroUsuario(email, password, nombre);
    } else {
        registrado = true;
    }

    if (registrado) {
        localStorage.setItem('usuario_nombre', nombre);
        localStorage.setItem('usuario_email', email);
        if (!localStorage.getItem('usuario_id')) {
            localStorage.setItem('usuario_id', 'usr_' + Date.now());
        }
        if (!localStorage.getItem('token_sesion')) {
            localStorage.setItem('token_sesion', 'tok_' + Date.now());
        }

        const gateSection = document.getElementById('diagnostico-gate');
        if (gateSection) gateSection.style.display = 'none';

        showDiagnosticResult();
        alert('🎉 ¡Cuenta creada con éxito! Tu Diagnóstico Migratorio Oficial ha sido desbloqueado.');
    }
}
window.handleGateRegisterSubmit = handleGateRegisterSubmit;

// Login desde el paso de diagnóstico
async function handleGateLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const email = document.getElementById('gateLoginEmail')?.value?.trim();
    const password = document.getElementById('gateLoginPassword')?.value;

    if (!email || !password) {
        alert('Por favor ingresa tu correo electrónico y tu contraseña.');
        return;
    }

    try {
        const supabase = getSbClient();
        if (supabase && supabase.auth) {
            const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password });
            if (error) {
                alert('❌ ' + error.message);
                return;
            }
            localStorage.setItem('usuario_id', data.user.id);
            localStorage.setItem('usuario_email', data.user.email);
            localStorage.setItem('token_sesion', data.session.access_token);
            const { data: userData } = await supabase.from('usuarios').select('*').eq('id', data.user.id).single();
            if (userData && userData.nombre) {
                localStorage.setItem('usuario_nombre', userData.nombre);
            }
        } else {
            localStorage.setItem('usuario_email', email);
            localStorage.setItem('usuario_id', 'usr_' + Date.now());
            localStorage.setItem('token_sesion', 'tok_' + Date.now());
        }

        const gateSection = document.getElementById('diagnostico-gate');
        if (gateSection) gateSection.style.display = 'none';

        showDiagnosticResult();
        alert('✅ ¡Sesión iniciada con éxito! Tu informe de diagnóstico ha sido desbloqueado.');
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        alert('❌ Error al iniciar sesión: ' + err.message);
    }
}
window.handleGateLoginSubmit = handleGateLoginSubmit;

// Login con Google desde diagnóstico
async function loginConGoogleDiagnostico() {
    localStorage.setItem('pending_diagnostic_answers', JSON.stringify(appState.answers));
    localStorage.setItem('pending_diagnostic_action', 'show_result');
    if (typeof loginConGoogle === 'function') {
        await loginConGoogle();
    }
}
window.loginConGoogleDiagnostico = loginConGoogleDiagnostico;

// Login con Apple desde diagnóstico
async function loginConAppleDiagnostico() {
    localStorage.setItem('pending_diagnostic_answers', JSON.stringify(appState.answers));
    localStorage.setItem('pending_diagnostic_action', 'show_result');
    if (typeof loginConApple === 'function') {
        await loginConApple();
    }
}
window.loginConAppleDiagnostico = loginConAppleDiagnostico;

// Show Diagnostic Result - Renderizado Dinámico
function showDiagnosticResult() {
    const diagnosticoSection = document.getElementById('diagnostico');
    const gateSection = document.getElementById('diagnostico-gate');
    const resultSection = document.getElementById('diagnostico-resultado');

    if (diagnosticoSection) diagnosticoSection.style.display = 'none';
    if (gateSection) gateSection.style.display = 'none';
    if (resultSection) resultSection.style.display = 'block';

    // Evaluar las respuestas del usuario y obtener los resultados dinámicos
    const resultados = evaluarDiagnosticoMigratorio(appState.answers);
    const principal = resultados[0];

    if (principal) {
        localStorage.setItem('diagnostico_tramite_recomendado', principal.titulo);
        localStorage.setItem('tramite_activo_nombre', principal.titulo);
        localStorage.setItem('plan_activo', 'true');
        if (typeof actualizarIndicadorTramiteActivo === 'function') {
            actualizarIndicadorTramiteActivo();
        }

        // Actualizar tarjeta principal
        const badgeEl = document.querySelector('#diagnostico-resultado .result-badge');
        const titleEl = document.querySelector('#diagnostico-resultado .result-service');
        const descEl = document.querySelector('#diagnostico-resultado .result-service-desc');
        const risksEl = document.querySelector('#diagnostico-resultado .risk-factors');
        const reqList = document.querySelector('#diagnostico-resultado .requirements-list');
        const stepsList = document.querySelector('#diagnostico-resultado .steps-list');

        if (badgeEl) badgeEl.textContent = principal.badge || "✓ TRÁMITE PRINCIPAL RECOMENDADO";
        if (titleEl) titleEl.textContent = principal.titulo;
        if (descEl) descEl.textContent = principal.descripcion;

        if (risksEl && principal.riesgos && principal.riesgos.length > 0) {
            risksEl.innerHTML = `
                <div class="risk-icon">⚖️</div>
                <div>
                    <h4>Análisis y Factores Legales Detectados</h4>
                    <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
                        ${principal.riesgos.map(r => `<p style="margin: 0; line-height: 1.4;">${r}</p>`).join('')}
                    </div>
                </div>
            `;
        }

        if (reqList && principal.requisitos) {
            reqList.innerHTML = principal.requisitos.map(r => `<li>${r}</li>`).join('');
        }

        if (stepsList && principal.pasos) {
            stepsList.innerHTML = principal.pasos.map((paso, index) => `
                <div class="step">
                    <div class="step-number">${index + 1}</div>
                    <p>${paso}</p>
                </div>
            `).join('');
        }

        // Renderizar otros trámites recomendados si aplican
        let extraContainer = document.getElementById('otros-resultados-container');
        if (!extraContainer) {
            const resultCard = document.querySelector('#diagnostico-resultado .result-card');
            if (resultCard && resultCard.parentNode) {
                extraContainer = document.createElement('div');
                extraContainer.id = 'otros-resultados-container';
                extraContainer.style.marginTop = '24px';
                extraContainer.style.marginBottom = '24px';
                resultCard.parentNode.insertBefore(extraContainer, resultCard.nextSibling);
            }
        }

        if (extraContainer) {
            if (resultados.length > 1) {
                const otros = resultados.slice(1);
                extraContainer.innerHTML = `
                    <div style="background: #ffffff; border: 2px solid #10b981; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                            <span style="font-size: 24px;">📋</span>
                            <div>
                                <h3 style="margin: 0; color: #1a6b5e; font-size: 20px; font-weight: 700;">Otros trámites y servicios recomendados para tu caso</h3>
                                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Según tus respuestas, también calificas o te recomendamos complementar con:</p>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            ${otros.map(res => `
                                <div style="padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #1a6b5e; border-radius: 8px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                                        <h4 style="margin: 0; color: #1e293b; font-size: 17px; font-weight: 700;">${res.titulo}</h4>
                                        <span style="font-size: 12px; font-weight: 600; background: #e6f4f1; color: #1a6b5e; padding: 4px 10px; border-radius: 12px;">${res.badge}</span>
                                    </div>
                                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 500;"><strong>Base legal:</strong> ${res.baseLegal}</p>
                                    <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.5;">${res.descripcion}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                extraContainer.style.display = 'block';
            } else {
                extraContainer.innerHTML = '';
                extraContainer.style.display = 'none';
            }
        }
    }

    window.scrollTo(0, 0);
}

// Start Diagnostico
function startDiagnostico() {
    appState.currentQuestion = 0;
    appState.answers = {};
    const gateSection = document.getElementById('diagnostico-gate');
    const resultSection = document.getElementById('diagnostico-resultado');
    if (gateSection) gateSection.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';
    showSection('diagnostico');
}

// Reset Diagnostico
function resetDiagnostico() {
    startDiagnostico();
}

// Scroll to Services
function scrollToServices() {
    const servicesSection = document.querySelector('.services-section');
    if (servicesSection) {
        showSection('inicio');
        setTimeout(() => {
            servicesSection.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }
}

// Upload Area Setup
function setupUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    if (!uploadArea || !fileInput) return;

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--color-primary)';
        uploadArea.style.backgroundColor = '#f0faf8';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#1a6b5e';
        uploadArea.style.backgroundColor = 'rgba(26, 107, 94, 0.05)';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#1a6b5e';
        uploadArea.style.backgroundColor = 'rgba(26, 107, 94, 0.05)';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect();
        }
    });

    fileInput.addEventListener('change', handleFileSelect);
}

// Handle File Select
function handleFileSelect() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = file.name;
        const fileSize = (file.size / 1024 / 1024).toFixed(2);

        uploadArea.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 10px;">✓</div>
            <p style="color: var(--color-success); font-weight: 600;">${fileName}</p>
            <small>${fileSize} MB</small>
        `;
    }
}

// Setup Document Form
function setupDocumentForm() {
    const form = document.querySelector('.upload-form');
    if (!form) return;

    const submitBtn = form.querySelector('.btn-primary');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleDocumentUpload);
    }
}

// Handle Document Upload
function handleDocumentUpload(e) {
    e.preventDefault();

    const docType = document.getElementById('doc-type');
    const docName = document.getElementById('doc-name');
    const fileInput = document.getElementById('fileInput');

    if (!docType || !docType.value) {
        alert('Por favor selecciona un tipo de documento');
        return;
    }

    if (!fileInput || fileInput.files.length === 0) {
        alert('Por favor selecciona un archivo');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const documentObj = {
            id: Date.now(),
            type: docType.value,
            name: (docName && docName.value) ? docName.value : file.name,
            fileName: file.name,
            fileSize: (file.size / 1024 / 1024).toFixed(2),
            dateUploaded: new Date().toLocaleDateString('es-ES'),
            fileData: e.target.result
        };

        appState.documents.push(documentObj);
        saveDocumentsToStorage();

        // Reset form
        docType.value = '';
        if (docName) docName.value = '';
        fileInput.value = '';
        
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-icon">📁</div>
                <p>Haz clic para seleccionar un archivo</p>
                <small>JPG, PNG, PDF - máx. 10 MB</small>
            `;
        }

        alert('✓ Documento subido exitosamente');
        displayDocuments();
    };

    reader.readAsDataURL(file);
}

// Save Documents to Storage
function saveDocumentsToStorage() {
    const documentsToSave = appState.documents.map(doc => ({
        ...doc,
        fileData: undefined
    }));
    localStorage.setItem('relocatepass_documents', JSON.stringify(documentsToSave));
}

// Load Documents from Storage
function loadDocumentsFromStorage() {
    const stored = localStorage.getItem('relocatepass_documents');
    if (stored) {
        appState.documents = JSON.parse(stored);
        displayDocuments();
    }
}

// Display Documents
function displayDocuments() {
    const documentsList = document.querySelector('.documents-list');
    if (!documentsList) return;

    if (appState.documents.length === 0) {
        documentsList.innerHTML = `
            <h3>Documentos enviados (0)</h3>
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>Aún no tienes documentos subidos.</p>
            </div>
        `;
        return;
    }

    let html = `<h3>Documentos enviados (${appState.documents.length})</h3>`;
    html += '<div class="documents-table">';

    const docTypeLabels = {
        'passaporte': '🛂 Pasaporte',
        'rne': '📝 RNE / CRNM',
        'cpf': '🔢 CPF',
        'certidao-nascimento': '👶 Partida / Certificado de Nacimiento',
        'comprovante-residencia': '🏠 Comprobante de Residencia',
        'certificado-antecedentes': '📜 Certificado de Antecedentes',
        'outro': '📄 Otro'
    };

    appState.documents.forEach(doc => {
        html += `
            <div class="document-item">
                <div class="document-info">
                    <div class="document-type">${docTypeLabels[doc.type] || doc.type}</div>
                    <div class="document-name">${doc.name}</div>
                    <div class="document-meta">${doc.fileSize} MB • ${doc.dateUploaded}</div>
                </div>
                <button class="btn-delete" onclick="deleteDocument(${doc.id})">Eliminar</button>
            </div>
        `;
    });

    html += '</div>';
    documentsList.innerHTML = html;
}

// Delete Document
function deleteDocument(docId) {
    if (confirm('¿Está seguro de que desea eliminar este documento?')) {
        appState.documents = appState.documents.filter(doc => doc.id !== docId);
        saveDocumentsToStorage();
        displayDocuments();
        alert('Documento eliminado exitosamente');
    }
}

// Setup Profile Form conectado a Supabase
function setupProfileForm() {
    const form = document.querySelector('.profile-form');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('fullname')?.value || '';
        const email = document.getElementById('email')?.value || '';
        
        const supabaseClient = getSbClient();
        if (!supabaseClient) {
            alert('Perfil guardado localmente.');
            return;
        }

        const { data, error } = await supabaseClient
            .from('usuarios')
            .upsert([
                { email: email, nombre: nombre }
            ]);

        if (error) {
            console.error('Error al guardar:', error.message);
            alert('Hubo un error al guardar en Supabase.');
        } else {
            alert('¡Perfil guardado con éxito!');
        }
    });
}

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('App instalable disponible');
});

window.addEventListener('appinstalled', () => {
    console.log('App instalada exitosamente');
});

// --- DIAGNÓSTICO MIGRATORIO RELOCATEPASS (LEY 13.445/2017) ---
// Evalúa y devuelve dinámicamente según las respuestas del usuario los resultados:
// 1. Asesoría de Naturalización
// 2. Trámite de Residencia Temporal
// 3. Residencia Permanente
// 4. Renovación de Residencia RNM
// 5. Ayuda para trámites consulares y documentos públicos
function evaluarDiagnosticoMigratorio(respuestas) {
    const q0 = respuestas[0]; // Tiempo: 0: <1 año, 1: 1-4 años, 2: 4-15 años, 3: >15 años
    const q1 = respuestas[1]; // CRNM: 0: Vigente, 1: Vencido, 2: No tengo
    const q2 = respuestas[2]; // Portugués: 0: Fluido, 1: Intermedio, 2: Básico/nada
    const q3 = respuestas[3]; // Antecedentes: 0: Limpio, 1: En Brasil, 2: País de origen
    const q4 = respuestas[4]; // Familia brasileña: 0: Cónyuge, 1: Hijo, 2: Padre/madre, 3: No
    const q5 = respuestas[5]; // Situación migratoria: 0: Temporal, 1: Permanente, 2: Turista/corta, 3: Irregular
    const q6 = respuestas[6]; // Subsistencia: 0: Sí, 1: No
    const q7 = respuestas[7]; // Dependientes: 0: Sí, 1: No
    const q8 = respuestas[8]; // Objetivo: 0: Nacionalidad, 1: Residencia permanente, 2: Residencia temporal, 3: Regularización

    let alertasLegales = [];
    if (q1 === 1) {
        alertasLegales.push("⚠️ <strong>CRNM Vencido:</strong> Tu registro se encuentra vencido. Debes gestionar la renovación inmediata ante la Policía Federal para evitar multas diarias.");
    }
    if (q5 === 3) {
        alertasLegales.push("🚨 <strong>Estancia Irregular:</strong> Te encuentras sin estatus migratorio regular. Recomendamos iniciar tu regularización de residencia o amparo de inmediato.");
    }
    if (q3 === 1) {
        alertasLegales.push("🔴 <strong>Antecedentes Penales en Brasil:</strong> La legislación brasileña exige idoneidad moral. Se requerirá verificar si existe sentencia de rehabilitación judicial para tramitar.");
    }
    if (q3 === 2) {
        alertasLegales.push("⚠️ <strong>Antecedentes en el Exterior:</strong> Será necesario presentar certificado penal del país de origen apostillado y traducido por traductor juramentado.");
    }
    if (q2 === 2 && (q8 === 0 || q0 >= 2)) {
        alertasLegales.push("ℹ️ <strong>Requisito de Idioma:</strong> Para la Naturalización Ordinaria o Reducida se exige certificar competencia en portugués (examen CELPE-Bras o curso oficial MEC).");
    }
    if (alertasLegales.length === 0) {
        alertasLegales.push("✅ <strong>Perfil Migratorio Favorable:</strong> No se detectaron impedimentos legales ni factores de riesgo graves en tus respuestas.");
    }

    const servicios = [];

    // 1. Asesoría de Naturalización
    const calificaNaturalizacion = (q8 === 0) || (q0 === 3) || (q0 === 2 && (q5 === 0 || q5 === 1)) || ((q0 === 1 || q0 === 2) && (q4 === 0 || q4 === 1));
    if (calificaNaturalizacion) {
        let descNat = "Calificas para iniciar el proceso de Naturalización Ordinaria (Art. 65 de la Ley 13.445/2017), al cumplir con residencia continua en el país, idoneidad civil y capacidad de comunicación.";
        if (q0 === 3) {
            descNat = "Cumples con el requisito de más de 15 años de residencia ininterrumpida. Según el Art. 12, II, 'b' de la Constitución Federal, tienes derecho a la Naturalización Extraordinaria, sin exigencia de examen CELPE-Bras ni prueba de renta mínima.";
        } else if (q4 === 0 || q4 === 1) {
            descNat = "Al contar con vínculo familiar directo (cónyuge o hijo brasileño) y al menos 1 año de residencia, calificas para la Naturalización con plazo de residencia reducido (Art. 67, I y II de la Ley 13.445/2017).";
        }
        servicios.push({
            id: 'naturalizacion',
            titulo: "Asesoría de Naturalización",
            badge: q8 === 0 ? "✓ TRÁMITE PRINCIPAL RECOMENDADO" : "★ DERECHO CALIFICADO",
            baseLegal: "Ley 13.445/2017 (Arts. 65 a 70), Decreto 9.199/2017 y Constitución Federal (Art. 12)",
            descripcion: descNat,
            riesgos: alertasLegales,
            requisitos: [
                "CRNM vigente y copia de documento de identificación oficial",
                "Certificado de antecedentes penales federales, estatales y del país de origen",
                "Certificación de idioma portugués (CELPE-Bras o certificado oficial MEC, salvo naturalización extraordinaria)",
                "Comprobante de residencia en Brasil y capacidad de subsistencia",
                "Certificados negativos de tributos federales y justicia electoral"
            ],
            pasos: [
                "Reunir la documentación personal y verificar la vigencia de tu tarjeta CRNM",
                "Acreditar competencia en idioma portugués (CELPE-Bras o diploma MEC)",
                "Solicitar certificados de antecedentes penales en Brasil y el exterior",
                "Registrar solicitud formal en el portal electrónico del Ministerio de Justicia (MJSP) / Policía Federal",
                "Pagar tasa federal de solicitud y hacer seguimiento al análisis ministerial",
                "Solicitar el agendamiento en la plataforma de la Policía Federal para el trámite de RNE / Permiso de permanencia (temporal o permanente)",
                "Acudir el día y la hora a la cita en la Policía Federal para comparecencia y confirmación biográfica/biométrica",
                "Recibir la orden ministerial de naturalización y tramitar el pasaporte brasileño"
            ]
        });
    }

    // 2. Trámite de Residencia Temporal
    const calificaTemporal = (q8 === 2) || (q0 === 0) || (q5 === 2) || (q5 === 3 && q4 === 3);
    if (calificaTemporal) {
        servicios.push({
            id: 'residencia_temporal',
            titulo: "Trámite de Residencia Temporal",
            badge: q8 === 2 || q5 === 3 ? "✓ TRÁMITE PRINCIPAL RECOMENDADO" : "⚡ OPCIÓN MIGRATORIA",
            baseLegal: "Ley 13.445/2017 (Arts. 14, 30 y 31) y Acuerdos Mercosur/Migratorios",
            descripcion: (q5 === 2 || q5 === 3)
                ? "Actualmente te encuentras en estancia corta o irregular. El Trámite de Residencia Temporal (Art. 14 de la Ley 13.445/2017, acuerdos Mercosur o autorización laboral/estudiantil) te otorga estatus regular, derecho al trabajo y el primer CRNM por 2 años."
                : "El Trámite de Residencia Temporal es la vía legal para establecer o extender tu estancia en Brasil conforme al Art. 14 y 30 de la Ley de Migración, garantizando plenos derechos civiles y laborales.",
            riesgos: alertasLegales,
            requisitos: [
                "Pasaporte o documento de identidad oficial del país de origen",
                "Partida de nacimiento apostillada por el Convenio de La Haya",
                "Certificado de antecedentes penales de los países de residencia de los últimos 5 años",
                "Declaración jurada de residencia en Brasil y ausencia de antecedentes penales",
                "Comprobante de pago de tasas federales (GRU) de residencia y emisión de tarjeta"
            ],
            pasos: [
                "Identificar el acuerdo migratorio o base legal aplicable (Mercosur, estudio, trabajo, reunión familiar)",
                "Obtener y apostillar documentos en el país de origen (partidas y antecedentes)",
                "Realizar traducción juramentada al portugués con traductor oficial en territorio brasileño",
                "Completar formulario en el sistema SISMIGRA",
                "Pagar las tasas federales correspondientes (Guía de Recaudación de la Unión - GRU)",
                "Solicitar el agendamiento en la plataforma de la Policía Federal para el trámite de RNE / Permiso de permanencia (temporal o permanente)",
                "Acudir el día y la hora a la cita en la Policía Federal para toma biométrica",
                "Obtener el CRNM temporal y número de CPF"
            ]
        });
    }

    // 3. Residencia Permanente
    const calificaPermanente = (q8 === 1) || (q5 === 0 && (q0 === 2 || q0 === 3)) || (q4 === 0 || q4 === 1);
    if (calificaPermanente) {
        servicios.push({
            id: 'residencia_permanente',
            titulo: "Residencia Permanente",
            badge: q8 === 1 ? "✓ TRÁMITE PRINCIPAL RECOMENDADO" : "★ PERMANENCIA DEFINITIVA",
            baseLegal: "Ley 13.445/2017 (Art. 30 y 37) y Decreto 9.199/2017",
            descripcion: (q4 === 0 || q4 === 1)
                ? "Por tu vínculo familiar directo con ciudadano brasileño (cónyuge o hijo), tienes derecho a solicitar la Residencia Permanente directa por Reunión Familiar (Art. 37 y 65 de la Ley 13.445/2017), garantizando permanencia indefinida en el país."
                : "Al contar con residencia temporal previa en Brasil, puedes solicitar la transformación de tu estatus a Residencia Permanente (plazo indeterminado), consolidando tu estabilidad migratoria.",
            riesgos: alertasLegales,
            requisitos: [
                "CRNM temporal vigente o documentación probatoria del vínculo familiar en Brasil",
                "Documento de identidad / pasaporte original y copia",
                "Certificado de antecedentes penales en Brasil (Policía Federal y Justicia Estatal)",
                "Comprobante de residencia actual en Brasil y medios de vida lícitos",
                "Comprobante de pago de las tasas federales (GRU)"
            ],
            pasos: [
                "Verificar el cumplimiento del período legal de residencia temporal o vínculo familiar en Brasil",
                "Recopilar certificados de antecedentes limpios emitidos por autoridades brasileñas",
                "Llenar la solicitud electrónica de transformación de residencia en el sistema de la Policía Federal",
                "Generar y pagar la Guía de Recaudación de la Unión (GRU)",
                "Solicitar el agendamiento en la plataforma de la Policía Federal para el trámite de RNE / Permiso de permanencia (temporal o permanente)",
                "Acudir el día y la hora a la cita en la Policía Federal para registro y biometría",
                "Recibir la aprobación y recoger la nueva tarjeta CRNM por plazo indeterminado"
            ]
        });
    }

    // 4. Renovación de Residencia RNM
    const calificaRenovacion = (q1 === 1) || (q8 === 2 && (q1 === 0 || q1 === 1));
    if (calificaRenovacion) {
        servicios.push({
            id: 'renovacion_rnm',
            titulo: "Renovación de Residencia RNM",
            badge: q1 === 1 ? "⚡ REGULARIZACIÓN URGENTE" : "📋 ACTUALIZACIÓN DE CRNM",
            baseLegal: "Ley 13.445/2017 (Arts. 31 y 37) y directrices de la Policía Federal",
            descripcion: q1 === 1
                ? "⚠️ Tu documento CRNM / RNE se encuentra vencido. Es imprescindible tramitar la Renovación de Residencia RNM ante la Policía Federal para mantener tus derechos activos y evitar multas diarias."
                : "El servicio de Renovación de Residencia RNM permite actualizar tu tarjeta de identificación migratoria antes o durante su vencimiento, asegurando la continuidad de tu legalidad en Brasil (Art. 31 de la Ley 13.445/2017).",
            riesgos: alertasLegales,
            requisitos: [
                "Tarjeta CRNM anterior (vigente, próxima a vencer o vencida)",
                "Pasaporte o documento de identidad válido del país de origen",
                "Comprobante de residencia actualizado en el municipio de residencia",
                "Comprobante de pago de tasa federal GRU por emisión de tarjeta CRNM",
                "En caso de pérdida o extravío: Boletín de Ocurrencia (Boletim de Ocorrência)"
            ],
            pasos: [
                "Verificar fecha de vencimiento y categoría migratoria en la tarjeta CRNM anterior",
                "Ingresar al portal de la Policía Federal y completar la solicitud de renovación",
                "Emitir y abonar la tasa GRU para sustitución/renovación de cartera",
                "Solicitar el agendamiento en la plataforma de la Policía Federal para el trámite de RNE / Permiso de permanencia (temporal o permanente)",
                "Acudir el día y la hora a la cita en la Policía Federal con los documentos originales",
                "Recibir el protocolo de renovación y retirar la nueva tarjeta CRNM actualizada"
            ]
        });
    }

    // 5. Ayuda para trámites consulares y documentos públicos
    const calificaConsular = (q8 === 3) || (q1 === 2) || (q3 === 1 || q3 === 2) || (q5 === 3) || (servicios.length === 0);
    if (calificaConsular || servicios.length === 0) {
        servicios.push({
            id: 'tramites_consulares',
            titulo: "Ayuda para trámites consulares y documentos públicos",
            badge: q8 === 3 ? "✓ TRÁMITE PRINCIPAL RECOMENDADO" : "🌐 APOYO DOCUMENTAL",
            baseLegal: "Procedimientos consulares, Convenio de La Haya (Apostilla) y traducción juramentada en Brasil",
            descripcion: "Para tener éxito en tus procesos ante la Policía Federal y ministerios brasileños, es indispensable contar con documentación internacional correcta. Nuestro servicio te asiste en la obtención de certificados de antecedentes, partidas apostilladas, pasaportes y traducciones juramentadas al portugués.",
            riesgos: alertasLegales,
            requisitos: [
                "Documento de identidad nacional o pasaporte del país de origen",
                "Datos registrales para solicitud de actas de nacimiento/matrimonio o antecedentes",
                "Requisito de Apostilla de La Haya para validación internacional en Brasil",
                "Traducción juramentada al portugués por traductor público oficial en Brasil"
            ],
            pasos: [
                "Identificar el documento público o consular requerido para tu trámite en Brasil",
                "Agendar cita o gestionar solicitud ante el consulado u organismo emisor en el país de origen",
                "Obtener la Apostilla de La Haya en el país emisor para validez internacional",
                "Realizar la traducción juramentada oficial al portugués en territorio brasileño",
                "Verificar la conformidad documental antes de presentarlo ante la Policía Federal o MJSP"
            ]
        });
    }

    // Ordenar para que el servicio coincidente con el objetivo principal (q8) sea siempre el primero
    servicios.sort((a, b) => {
        const objetivoMap = {
            0: 'naturalizacion',
            1: 'residencia_permanente',
            2: 'residencia_temporal',
            3: 'tramites_consulares'
        };
        const idPrioritario = objetivoMap[q8];
        if (a.id === idPrioritario) return -1;
        if (b.id === idPrioritario) return 1;
        return 0;
    });

    return servicios;
}

// Exponer la función de diagnóstico globalmente
window.evaluarDiagnosticoMigratorio = evaluarDiagnosticoMigratorio;

// ============================================
// FUNCIONES DE CONTROL DE MODALES LEGALES (LGPD & CDC)
// ============================================

function abrirModalPoliticaPrivacidad(e) {
    if (e && e.preventDefault) e.preventDefault();
    const modal = document.getElementById('modalPoliticaPrivacidad');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function cerrarModalPoliticaPrivacidad() {
    const modal = document.getElementById('modalPoliticaPrivacidad');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function abrirModalTerminosUso(e) {
    if (e && e.preventDefault) e.preventDefault();
    const modal = document.getElementById('modalTerminosUso');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function cerrarModalTerminosUso() {
    const modal = document.getElementById('modalTerminosUso');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function imprimirDocumentoLegal(tipo) {
    const targetId = tipo === 'privacidad' ? 'modalPoliticaPrivacidad' : 'modalTerminosUso';
    const modalEl = document.getElementById(targetId);
    if (!modalEl) return;
    
    const contentBody = modalEl.querySelector('.legal-modal-body');
    const content = contentBody ? contentBody.innerHTML : '';
    const titulo = tipo === 'privacidad' 
        ? 'Política de Privacidad y Tratamiento de Datos Personales (LGPD) - RelocatePass' 
        : 'Términos y Condiciones Generales de Uso (CDC) - RelocatePass';
        
    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert('Por favor permite las ventanas emergentes en tu navegador para imprimir o guardar como PDF.');
        return;
    }
    
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${titulo}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
                h2 { color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
                h3 { color: #1a6b5e; margin-top: 20px; border-bottom: 1px solid #e2e8f0; }
                .legal-highlight-box { background: #f8fafc; border-left: 4px solid #1a6b5e; padding: 12px; margin: 16px 0; font-size: 13px; }
                @media print {
                    body { margin: 20px; }
                }
            </style>
        </head>
        <body>
            <h2>${titulo}</h2>
            <div>${content}</div>
        </body>
        </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
        printWin.print();
    }, 500);
}

// Cierre de modales con tecla Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModalPoliticaPrivacidad();
        cerrarModalTerminosUso();
    }
});

// Exponer funciones legalmente globales
window.abrirModalPoliticaPrivacidad = abrirModalPoliticaPrivacidad;
window.cerrarModalPoliticaPrivacidad = cerrarModalPoliticaPrivacidad;
window.abrirModalTerminosUso = abrirModalTerminosUso;
window.cerrarModalTerminosUso = cerrarModalTerminosUso;
window.imprimirDocumentoLegal = imprimirDocumentoLegal;

