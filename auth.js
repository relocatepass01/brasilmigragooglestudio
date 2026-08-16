// ============================================
// SISTEMA DE AUTENTICACIÓN SEGURA
// ============================================

function getSbClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof getSupabase === 'function') return getSupabase();
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        const SUPABASE_URL = 'https://wdhvycncwfydpgeqlvwb.supabase.co'; 
        const SUPABASE_KEY = 'sb_publishable_o4qKEJ1v7VgVpEGq1F2AAg_o7RvIrK5'; 
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return window.supabaseClient;
    }
    return null;
}

// ============================================
// LOGIN Y REGISTRO CON GOOGLE
// ============================================
async function loginConGoogle() {
  try {
    const supabase = getSbClient();
    if (!supabase) {
        alert('❌ El sistema de base de datos aún no ha iniciado.');
        return;
    }
    
    // Comando oficial de Supabase para OAuth con Google
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirige al usuario directamente al panel privado tras autenticarse/registrarse
        redirectTo: window.location.origin + '/dashboard.html' 
      }
    });

    if (error) {
      console.error('Error en login con Google:', error);
      alert('❌ Error al conectar con Google: ' + error.message);
    }
  } catch (error) {
    console.error('Error inesperado:', error);
    alert('❌ Ocurrió un error inesperado');
  }
}

// Expõe a função para o botão onclick do HTML conseguir encontrá-la
window.loginConGoogle = loginConGoogle;

// ============================================
// LOGIN Y REGISTRO CON APPLE (iPhone / Mac / iPad / Apple ID)
// ============================================
async function loginConApple() {
  try {
    const supabase = getSbClient();
    if (!supabase) {
        alert('❌ El sistema de base de datos aún no ha iniciado.');
        return;
    }
    
    // Comando oficial de Supabase para OAuth con Apple (Cuenta Apple / iPhone / Mac)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        // Redirige al usuario directamente al panel privado tras autenticarse con su Apple ID
        redirectTo: window.location.origin + '/dashboard.html' 
      }
    });

    if (error) {
      console.error('Error en login con Apple:', error);
      alert('❌ Error al conectar con Apple: ' + error.message + '\n\n💡 Sugerencia: Si aún no tienes configurado Apple en tu consola de Supabase, puedes ingresar inmediatamente con Google o con tu correo y contraseña.');
    }
  } catch (error) {
    console.error('Error inesperado con Apple:', error);
    alert('❌ Ocurrió un error inesperado al conectar con Apple.');
  }
}

window.loginConApple = loginConApple;

// ============================================
// REGISTRO DE NUEVO USUARIO (EMAIL Y CONTRASEÑA)
// ============================================
async function registroUsuario(email, contraseña, nombre) {
    try {
        const supabase = getSbClient();
        if (!email || !email.includes('@')) { alert('❌ Email inválido'); return false; }
        if (!contraseña || contraseña.length < 8) { alert('❌ La contraseña debe tener mínimo 8 caracteres'); return false; }
        if (!nombre || nombre.length < 3) { alert('❌ El nombre debe tener mínimo 3 caracteres'); return false; }

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: contraseña,
            options: { data: { nombre: nombre } }
        });

        if (error) {
            alert('❌ Error al registrar: ' + error.message);
            return false;
        }

        const { error: dbError } = await supabase
            .from('usuarios')
            .insert([{ id: data.user.id, email: email, nombre: nombre, created_at: new Date() }]);

        if (dbError) {
            alert('❌ Error al guardar perfil: ' + dbError.message);
            return false;
        }

        alert('✅ Registro exitoso! Verifica tu email para confirmar');
        return true;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

// ============================================
// LOGIN DE USUARIO (EMAIL Y CONTRASEÑA)
// ============================================
async function loginUsuario(email, contraseña) {
    try {
        const supabase = getSbClient();
        if (!email || !contraseña) { alert('❌ Completa todos los campos'); return false; }

        const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: contraseña });
        if (error) { alert('❌ Email o contraseña inválida'); return false; }

        localStorage.setItem('usuario_id', data.user.id);
        localStorage.setItem('usuario_email', data.user.email);
        localStorage.setItem('token_sesion', data.session.access_token);

        const { data: userData } = await supabase.from('usuarios').select('*').eq('id', data.user.id).single();
        if (userData) { localStorage.setItem('usuario_nombre', userData.nombre); }

        alert('✅ Bienvenido');
        window.location.href = 'dashboard.html';
        return true;
    } catch (error) {
        alert('❌ Error: ' + error.message);
        return false;
    }
}

// ============================================
// LOGOUT DE USUARIO
// ============================================
async function logoutUsuario() {
    try {
        const supabase = getSbClient();
        if (supabase) await supabase.auth.signOut();
        localStorage.clear();
        alert('✅ Sesión cerrada');
        window.location.href = 'index.html';
        return true;
    } catch (error) {
        return false;
    }
}

function verificarSesion() {
    const usuarioId = localStorage.getItem('usuario_id');
    const token = localStorage.getItem('token_sesion');
    if (!usuarioId || !token) return false;
    return { id: usuarioId, email: localStorage.getItem('usuario_email'), nombre: localStorage.getItem('usuario_nombre') };
}

function verificarAcceso() {
    const sesion = verificarSesion();
    if (!sesion) { alert('❌ Debes iniciar sesión primero'); window.location.href = 'index.html'; return false; }
    return sesion;
}

// ============================================
// CAMBIAR CONTRASEÑA
// ============================================
async function cambiarContraseña(contraseñaActual, contraseñaNueva) {
    try {
        const supabase = getSbClient();
        if (!contraseñaNueva || contraseñaNueva.length < 8) {
            alert('❌ La nueva contraseña debe tener mínimo 8 caracteres');
            return false;
        }
        const { error } = await supabase.auth.updateUser({ password: contraseñaNueva });
        if (error) {
            alert('❌ Error al cambiar contraseña: ' + error.message);
            return false;
        }
        alert('✅ Contraseña cambiada exitosamente');
        return true;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

// ============================================
// RECUPERAR CONTRASEÑA
// ============================================
async function recuperarContraseña(email) {
    try {
        const supabase = getSbClient();
        if (!email) { alert('❌ Ingresa tu email'); return false; }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        if (error) { alert('❌ Error: ' + error.message); return false; }
        alert('✅ Email de recuperación enviado. Revisa tu bandeja de entrada');
        return true;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

// ============================================
// OBTENER USUARIO ACTUAL
// ============================================
async function obtenerUsuarioActual() {
    try {
        const supabase = getSbClient();
        if (!supabase) return null;
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) return null;
        return data.user;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// ============================================
// ACTUALIZAR PERFIL Y OBTENER PERFIL
// ============================================
async function actualizarPerfil(usuarioId, datos) {
    try {
        const supabase = getSbClient();
        await supabase.from('usuarios').update({ nombre: datos.nombre || undefined }).eq('id', usuarioId);
        await supabase.from('perfil_usuario').upsert({
            usuario_id: usuarioId, pasaporte: datos.pasaporte, rne: datos.rne, cpf: datos.cpf,
            direccion: datos.direccion, fecha_llegada: datos.fecha_llegada, nationalidad: datos.nationalidad
        });
        alert('✅ Perfil actualizado exitosamente');
        return true;
    } catch (error) {
        alert('❌ Error: ' + error.message);
        return false;
    }
}

async function obtenerPerfilCompleto(usuarioId) {
    try {
        const supabase = getSbClient();
        const { data: usuario } = await supabase.from('usuarios').select('*').eq('id', usuarioId).single();
        const { data: perfil } = await supabase.from('perfil_usuario').select('*').eq('usuario_id', usuarioId).single();
        return { ...usuario, ...(perfil || {}) };
    } catch (error) {
        return null;
    }
}
