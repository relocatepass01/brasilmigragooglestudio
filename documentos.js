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

document.addEventListener('DOMContentLoaded', function() {
    const usuarioId = localStorage.getItem('usuario_id');
    if (usuarioId) {
        cargarDocumentos(usuarioId);
    }
});
