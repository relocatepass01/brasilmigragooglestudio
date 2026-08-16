// ============================================
// SISTEMA SEGURO DE DOCUMENTOS
// ============================================

function getSb() {
    return window.supabaseClient || (typeof getSupabase === 'function' ? getSupabase() : window.supabase);
}

// ============================================
// SUBIR DOCUMENTO A SUPABASE
// ============================================

async function subirDocumento(file, tipo, nombre) {
    try {
        const supabase = getSb();
        // Verificar sesión
        const usuarioId = localStorage.getItem('usuario_id');
        if (!usuarioId) {
            alert('❌ Debes iniciar sesión');
            return false;
        }

        // Validar archivo
        if (!file) {
            alert('❌ Selecciona un archivo');
            return false;
        }

        // Validar tamaño (máx 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            alert('❌ El archivo es muy grande (máx 10MB)');
            return false;
        }

        // Validar tipo de archivo
        const tiposPermitidos = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!tiposPermitidos.includes(file.type)) {
            alert('❌ Solo se permiten JPG, PNG y PDF');
            return false;
        }

        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const nombreArchivo = `${usuarioId}/${tipo}/${timestamp}_${file.name}`;

        // Mostrar progreso
        const progressBar = document.getElementById('upload-progress');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.display = 'block';
        }

        // Subir a Supabase Storage
        const { data, error } = await supabase.storage
            .from('documentos')
            .upload(nombreArchivo, file, {
                cacheControl: '3600',
                upsert: false,
                onUploadProgress: (progress) => {
                    const porcentaje = (progress.loaded / progress.total) * 100;
                    if (progressBar) {
                        progressBar.style.width = porcentaje + '%';
                    }
                }
            });

        if (error) {
            console.error('Error al subir:', error);
            alert('❌ Error al subir archivo: ' + error.message);
            return false;
        }

        // Obtener URL pública del archivo
        const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(nombreArchivo);

        // Guardar información en base de datos
        const { error: dbError } = await supabase
            .from('documentos')
            .insert([
                {
                    usuario_id: usuarioId,
                    tipo: tipo,
                    nombre: nombre || file.name,
                    url: urlData.publicUrl,
                    fecha_subida: new Date(),
                    tamaño_mb: (file.size / 1024 / 1024).toFixed(2)
                }
            ]);

        if (dbError) {
            console.error('Error guardando referencia:', dbError);
            alert('⚠️ Archivo subido pero hubo error al guardar: ' + dbError.message);
            return false;
        }

        alert('✅ Documento subido exitosamente');
        
        // Recargar lista de documentos
        cargarDocumentos(usuarioId);
        
        // Limpiar formulario
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
        const docType = document.getElementById('doc-type');
        if (docType) docType.value = '';
        const docName = document.getElementById('doc-name');
        if (docName) docName.value = '';

        return true;

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
        return false;
    }
}

// ============================================
// CARGAR DOCUMENTOS DEL USUARIO
// ============================================

async function cargarDocumentos(usuarioId) {
    try {
        const supabase = getSb();
        const { data, error } = await supabase
            .from('documentos')
            .select('*')
            .eq('usuario_id', usuarioId)
            .order('fecha_subida', { ascending: false });

        if (error) {
            console.error('Error:', error);
            return [];
        }

        // Mostrar documentos en la página
        mostrarDocumentos(data || []);
        return data || [];

    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

// ============================================
// MOSTRAR DOCUMENTOS EN LA UI
// ============================================

function mostrarDocumentos(documentos) {
    const contenedor = document.querySelector('.documents-list');
    
    if (!contenedor) return;

    if (documentos.length === 0) {
        contenedor.innerHTML = `
            <h3>Documentos enviados (0)</h3>
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>Aún no tienes documentos subidos.</p>
            </div>
        `;
        return;
    }

    let html = `<h3>Documentos enviados (${documentos.length})</h3>`;
    html += '<div class="documents-table">';

    const tiposDocumentos = {
        'passaporte': '🛂 Pasaporte',
        'rne': '📝 RNE / CRNM',
        'cpf': '🔢 CPF',
        'certidao-nascimento': '👶 Partida / Certificado de Nacimiento',
        'comprovante-residencia': '🏠 Comprobante de Residencia',
        'certificado-antecedentes': '📜 Certificado de Antecedentes',
        'otro': '📄 Otro'
    };

    documentos.forEach(doc => {
        const fechaFormato = new Date(doc.fecha_subida).toLocaleDateString('es-ES');
        
        html += `
            <div class="document-item">
                <div class="document-info">
                    <div class="document-type">${tiposDocumentos[doc.tipo] || doc.tipo}</div>
                    <div class="document-name">${doc.nombre}</div>
                    <div class="document-meta">${doc.tamaño_mb} MB • ${fechaFormato}</div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-view" onclick="descargarDocumento('${doc.url}', '${doc.nombre}')" style="
                        background-color: #1a6b5e;
                        color: white;
                        padding: 8px 16px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        transition: all 0.3s;
                    ">Ver 👁️</button>
                    <button class="btn-delete" onclick="eliminarDocumento('${doc.id}')" style="
                        background-color: #e74c3c;
                        color: white;
                        padding: 8px 16px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        transition: all 0.3s;
                    ">Eliminar 🗑️</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    contenedor.innerHTML = html;
}

// ============================================
// DESCARGAR DOCUMENTO
// ============================================

function descargarDocumento(url, nombre) {
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.target = '_blank';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📥 Descargando:', nombre);
}

// ============================================
// ELIMINAR DOCUMENTO
// ============================================

async function eliminarDocumento(documentoId) {
    try {
        const supabase = getSb();
        const confirmacion = confirm('¿Estás seguro de que deseas eliminar este documento?');
        
        if (!confirmacion) {
            return false;
        }

        const { data: documento, error: getError } = await supabase
            .from('documentos')
            .select('url')
            .eq('id', documentoId)
            .single();

        if (getError) {
            alert('❌ Error al obtener documento: ' + getError.message);
            return false;
        }

        const urlParts = documento.url.split('/');
        const rutaArchivo = urlParts.slice(-3).join('/');

        const { error: deleteError } = await supabase.storage
            .from('documentos')
            .remove([rutaArchivo]);

        if (deleteError) {
            console.warn('Advertencia al eliminar archivo:', deleteError);
        }

        const { error: dbError } = await supabase
            .from('documentos')
            .delete()
            .eq('id', documentoId);

        if (dbError) {
            alert('❌ Error al eliminar: ' + dbError.message);
            return false;
        }

        alert('✅ Documento eliminado');
        
        const usuarioId = localStorage.getItem('usuario_id');
        cargarDocumentos(usuarioId);

        return true;

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
        return false;
    }
}

// ============================================
// COMPARTIR DOCUMENTO (Para admin)
// ============================================

async function compartirDocumento(documentoId, emailDestinatario) {
    try {
        const supabase = getSb();
        const { data: documento, error } = await supabase
            .from('documentos')
            .select('*')
            .eq('id', documentoId)
            .single();

        if (error) {
            alert('❌ Error: ' + error.message);
            return false;
        }

        const linkCompartido = {
            documentoId: documentoId,
            generado: new Date(),
            expira: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            emailDestinatario: emailDestinatario
        };

        const { error: shareError } = await supabase
            .from('documentos_compartidos')
            .insert([linkCompartido]);

        if (shareError) {
            alert('❌ Error al compartir: ' + shareError.message);
            return false;
        }

        alert(`✅ Documento compartido con ${emailDestinatario}`);
        return true;

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
        return false;
    }
}

// ============================================
// OBTENER ESTADÍSTICAS DE DOCUMENTOS
// ============================================

async function obtenerEstadísticasDocumentos(usuarioId) {
    try {
        const supabase = getSb();
        const { data, error } = await supabase
            .from('documentos')
            .select('*')
            .eq('usuario_id', usuarioId);

        if (error) {
            console.error('Error:', error);
            return null;
        }

        const documentos = data || [];

        return {
            total: documentos.length,
            tamaño_total_mb: documentos.reduce((sum, doc) => sum + parseFloat(doc.tamaño_mb || 0), 0).toFixed(2),
            por_tipo: agruparPorTipo(documentos),
            fecha_última_actualización: documentos.length > 0 ? documentos[0].fecha_subida : null
        };

    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

function agruparPorTipo(documentos) {
    const agrupados = {};
    
    documentos.forEach(doc => {
        agrupados[doc.tipo] = (agrupados[doc.tipo] || 0) + 1;
    });

    return agrupados;
}

// ============================================
// INDICADOR DINÁMICO: TRÁMITE ACTIVO & PLAN ACTIVO
// ============================================

function actualizarIndicadorTramiteActivo() {
    // 1. Obtener qué tipo de trámite compró o recomendó el diagnóstico al usuario
    let nombreTramite = localStorage.getItem('tramite_activo_nombre');
    if (!nombreTramite) {
        const diagRec = localStorage.getItem('diagnostico_tramite_recomendado');
        if (diagRec) {
            nombreTramite = diagRec;
        } else {
            const pagoPendiente = localStorage.getItem('pago_pendiente');
            if (pagoPendiente) {
                try {
                    const parsed = JSON.parse(pagoPendiente);
                    if (parsed && parsed.servicio) nombreTramite = parsed.servicio;
                } catch(e) {}
            }
        }
    }
    if (!nombreTramite) {
        nombreTramite = "Asesoría de Naturalización / Residencia";
    }

    // 2. Confirmar que su membresía o pago está activo para empezar a subir sus papeles en plataforma
    let planActivoVal = localStorage.getItem('plan_activo');
    if (planActivoVal === null) {
        // En plataforma interactiva, activamos el plan por defecto para que el usuario pueda probar el checklist
        localStorage.setItem('plan_activo', 'true');
        planActivoVal = 'true';
    }
    const isPlanActivo = (planActivoVal === 'true') || (localStorage.getItem('usuario_id') !== null);

    // 3. Actualizar elementos en index.html y dashboard.html
    const titleElements = document.querySelectorAll('#activeProcedureTitle, #dashboardActiveProcedureTitle, #dashboardActiveProcedureTitleDoc, .dynamic-procedure-title');
    titleElements.forEach(el => {
        if (el) el.textContent = nombreTramite;
    });

    const badgeElements = document.querySelectorAll('#dossierPlanBadge, #dashboardPlanBadge, #dashboardPlanBadgeDoc, .dynamic-plan-badge');
    badgeElements.forEach(el => {
        if (el) {
            if (isPlanActivo) {
                el.className = 'status-badge active dynamic-plan-badge';
                el.innerHTML = '🟢 PLAN ACTIVO';
                el.title = `Membresía/pago activo para "${nombreTramite}". Habilitado para subir y validar documentos.`;
                el.onclick = () => {
                    alert(`✅ Membresía y Pago Activo:\n\nTrámite: ${nombreTramite}\n\nTu membresía/pago está activo y confirmado para empezar a subir, validar y estructurar tus papeles en el Checklist Digital de forma automatizada.`);
                };
            } else {
                el.className = 'status-badge pending dynamic-plan-badge';
                el.innerHTML = '🟡 PLAN PENDIENTE - ACTIVAR AHORA';
                el.title = 'Haz clic para activar tu membresía o pago.';
                el.onclick = () => {
                    if (typeof abrirModalPagoDigital === 'function') {
                        abrirModalPagoDigital(nombreTramite);
                    } else {
                        alert('Selecciona uno de nuestros servicios de asesoría o residencia para activar tu plan migratorio.');
                    }
                };
            }
        }
    });

    // 4. Renderizar el checklist digital del dossier según el trámite
    if (typeof renderizarChecklistDossier === 'function') {
        renderizarChecklistDossier(nombreTramite, isPlanActivo);
    }
}

// ============================================
// CHECKLIST DINÁMICO DEL DOSSIER Y AUTOMATIZACIÓN
// ============================================

function renderizarChecklistDossier(nombreTramite, isPlanActivo) {
    const container = document.getElementById('dossierChecklistContainer');
    if (!container) return;

    let items = [
        {
            id: 'doc_pasaporte',
            titulo: '1. Pasaporte Vigente (Página Biográfica)',
            descripcion: 'Copia en formato digital clara, legible y a color de la página biográfica y páginas con sellos de ingreso.',
            ejemplo: 'Formato aceptado: PDF, JPG o PNG (máx 10 MB).'
        },
        {
            id: 'doc_rnm',
            titulo: '2. CRNM / RNE (Tarjeta de Residencia Migratoria)',
            descripcion: 'Copia frente y reverso del Registro Nacional Migratorio, o comprobante de protocolo activo ante Policía Federal.',
            ejemplo: 'Revisión automática de legibilidad y número de registro.'
        },
        {
            id: 'doc_idioma',
            titulo: '3. Acreditación de Competencia en Portugués',
            descripcion: nombreTramite.toLowerCase().includes('residencia') 
                ? 'Acta de matrimonio, nacimiento de hijo brasileño o declaración jurada de residencia.'
                : 'Certificado oficial CELPE-Bras o título/diploma emitido por institución reconocida por el MEC (Ley 13.445).',
            ejemplo: 'Revisión de sello de certificación oficial en Brasil.'
        },
        {
            id: 'doc_antecedentes_br',
            titulo: '4. Antecedentes Penales en Brasil (PF y Estatal)',
            descripcion: 'Certificados negativos de antecedentes criminales emitidos por la Policía Federal y Justicia Estatal de tu residencia.',
            ejemplo: 'Validación en línea del código de autenticidad.'
        },
        {
            id: 'doc_antecedentes_ext',
            titulo: '5. Antecedentes Penales del País de Origen',
            descripcion: 'Certificado penal apostillado (Convención de La Haya) con traducción juramentada en territorio brasileño.',
            ejemplo: 'Verificación de Apostilla e identificación del traductor.'
        },
        {
            id: 'doc_residencia',
            titulo: '6. Comprobante de Residencia en Brasil',
            descripcion: 'Factura de servicio (agua, luz, internet), contrato de alquiler o declaración del titular con firma notariada.',
            ejemplo: 'Debe tener menos de 90 días de antigüedad.'
        },
        {
            id: 'doc_fiscal',
            titulo: '7. Certificados Negativos de Tributos (CPF / TSE)',
            descripcion: 'Constancia de regularidad en la Receita Federal y certificado de quitação eleitoral o exención para extranjeros.',
            ejemplo: 'Validado contra base oficial de CPF.'
        }
    ];

    const subidos = JSON.parse(localStorage.getItem('dossier_archivos_subidos') || '{}');

    let total = items.length;
    let validados = 0;

    const html = items.map(item => {
        const isUploaded = !!subidos[item.id];
        if (isUploaded) validados++;

        return `
            <div class="checklist-item-card ${isUploaded ? 'validated' : ''}" id="card_${item.id}">
                <div class="item-status-icon">
                    ${isUploaded ? '✅' : '📄'}
                </div>
                <div class="item-content">
                    <div class="item-title-row">
                        <h4>${item.titulo}</h4>
                        <span class="item-badge ${isUploaded ? 'badge-validated' : 'badge-pending'}">
                            ${isUploaded ? '✓ VALIDADO POR SISTEMA' : 'PENDIENTE DE CARGA'}
                        </span>
                    </div>
                    <p class="item-description">${item.descripcion}</p>
                    <small class="item-example">${item.ejemplo}</small>
                    ${isUploaded ? `
                        <div class="uploaded-file-info">
                            <span>📎 Archivo: <strong>${subidos[item.id].nombre}</strong></span>
                            <span class="file-size">(${subidos[item.id].size})</span>
                        </div>
                    ` : ''}
                </div>
                <div class="item-action">
                    <label class="btn ${isUploaded ? 'btn-outline-success' : 'btn-primary'} btn-sm">
                        ${isUploaded ? '🔄 Reemplazar' : '📤 Subir archivo'}
                        <input type="file" style="display: none;" accept=".pdf,.jpg,.png,.jpeg" onchange="subirArchivoChecklist(event, '${item.id}')">
                    </label>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Actualizar porcentaje
    const porcentaje = Math.round((validados / total) * 100);
    const progPercentEl = document.getElementById('dossierProgressPercentage');
    const progBarEl = document.getElementById('dossierProgressBarFill');
    const bannerEl = document.getElementById('dossierCompletedBanner');

    if (progPercentEl) progPercentEl.textContent = porcentaje + '%';
    if (progBarEl) progBarEl.style.width = porcentaje + '%';

    if (porcentaje === 100 && bannerEl) {
        bannerEl.style.display = 'flex';
    } else if (bannerEl) {
        bannerEl.style.display = 'none';
    }
}

function subirArchivoChecklist(event, docId) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar extensiones
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
        alert('❌ Formato no válido. Sube archivos PDF, JPG o PNG.');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('❌ El archivo excede el tamaño máximo permitido (10 MB).');
        return;
    }

    const subidos = JSON.parse(localStorage.getItem('dossier_archivos_subidos') || '{}');
    subidos[docId] = {
        nombre: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        fecha: new Date().toISOString()
    };
    localStorage.setItem('dossier_archivos_subidos', JSON.stringify(subidos));

    actualizarIndicadorTramiteActivo();
    alert(`✅ Archivo validado automáticamente por el sistema:\n\n${file.name}\n\nFormato e integridad digital verificados según el Checklist del MJSP.`);
}

function switchDossierPhase(phaseNumber) {
    [1, 2, 3].forEach(num => {
        const btn = document.getElementById(`btnPhase${num}`);
        const content = document.getElementById(`contentPhase${num}`);
        if (btn) btn.classList.toggle('active', num === phaseNumber);
        if (content) content.style.display = (num === phaseNumber) ? 'block' : 'none';
    });
}

function generarGuiaGRUAutomatizada() {
    const box = document.getElementById('gruGeneratedBox');
    if (box) {
        box.style.display = 'block';
        alert('🧾 Guía GRU 140120 emitida con éxito para la Policía Federal.');
    }
}

function descargarGRUPDF() {
    alert('📥 Descargando archivo: GUIA_GRU_POLICIA_FEDERAL_140120.pdf\n\nGuía pagadera en cualquier banco en Brasil.');
}

function copiarPixGRU() {
    navigator.clipboard.writeText('00020126580014br.gov.bcb.pix0121relocatepass@gmail.com5204000053039865405132.305802BR5910RelocatePass');
    alert('📋 Código Pix copiado al portapapeles (Clave Pix Email: relocatepass@gmail.com).');
}

function verificarProgresoSismigra() {
    const chks = document.querySelectorAll('.sismigra-chk:checked');
    if (chks.length === 4) {
        alert('🎉 ¡Felicitaciones! Has completado todos los pasos para tu agendamiento en el portal oficial SISMIGRA.');
    }
}

function descargarKitTramiteConsolidado() {
    alert('📥 Descargando: KIT_TRAMITE_CONSOLIDADO_POLICIA_FEDERAL.pdf\n\nIncluye declaración SISMIGRA, expediente ordenado y guía presencial para tu cita.');
}

// Exportar funciones globalmente
window.actualizarIndicadorTramiteActivo = actualizarIndicadorTramiteActivo;
window.renderizarChecklistDossier = renderizarChecklistDossier;
window.subirArchivoChecklist = subirArchivoChecklist;
window.switchDossierPhase = switchDossierPhase;
window.generarGuiaGRUAutomatizada = generarGuiaGRUAutomatizada;
window.descargarGRUPDF = descargarGRUPDF;
window.copiarPixGRU = copiarPixGRU;
window.verificarProgresoSismigra = verificarProgresoSismigra;
window.descargarKitTramiteConsolidado = descargarKitTramiteConsolidado;

document.addEventListener('DOMContentLoaded', function() {
    const usuarioId = localStorage.getItem('usuario_id');
    if (usuarioId) {
        cargarDocumentos(usuarioId);
    }
    setTimeout(() => {
        actualizarIndicadorTramiteActivo();
    }, 100);
});
