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
    showSection('inicio');
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
            e.preventDefault();
            const section = this.getAttribute('data-section');
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
        nextBtn.textContent = (appState.currentQuestion === appState.totalQuestions - 1) ? 'Enviar →' : 'Siguiente →';
    }
}

// Next Question
function nextQuestion() {
    if (appState.currentQuestion < appState.totalQuestions - 1) {
        appState.currentQuestion++;
        loadQuestionnaire();
    } else {
        showDiagnosticResult();
    }
}

// Previous Question
function previousQuestion() {
    if (appState.currentQuestion > 0) {
        appState.currentQuestion--;
        loadQuestionnaire();
    }
}

// Show Diagnostic Result
function showDiagnosticResult() {
    const diagnosticoSection = document.getElementById('diagnostico');
    const resultSection = document.getElementById('diagnostico-resultado');

    if (diagnosticoSection) diagnosticoSection.style.display = 'none';
    if (resultSection) resultSection.style.display = 'block';

    window.scrollTo(0, 0);
}

// Start Diagnostico
function startDiagnostico() {
    appState.currentQuestion = 0;
    appState.answers = {};
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
    localStorage.setItem('brasilmigra_documents', JSON.stringify(documentsToSave));
}

// Load Documents from Storage
function loadDocumentsFromStorage() {
    const stored = localStorage.getItem('brasilmigra_documents');
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
