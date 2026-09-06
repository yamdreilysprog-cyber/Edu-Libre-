// src/scripts/auth.js

export function validateForm(form) {
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;
    inputs.forEach(input => {
        // Si es un checkbox, validamos si está marcado
        if (input.type === 'checkbox') {
            if (!input.checked) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        } 
        // Si es input de texto/email/password, validamos su contenido
        else if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });
    return isValid;
}

// Convierte { 'institution.name': 'X', 'institution.type': 'Y', name: 'Juan' }
// en { institution: { name: 'X', type: 'Y' }, name: 'Juan' }
function unflatten(data) {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
        if (key.includes('.')) {
            const [parent, child] = key.split('.');
            if (!result[parent]) result[parent] = {};
            result[parent][child] = value;
        } else {
            result[key] = value;
        }
    }
    return result;
}

// Elimina recursivamente strings vacíos para no romper campos .optional() de Zod
function stripEmptyStrings(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const nested = stripEmptyStrings(value);
            if (Object.keys(nested).length > 0) result[key] = nested;
        } else if (value !== '') {
            result[key] = value;
        }
    }
    return result;
}

export async function handleAuthSubmit(form, endpoint) {
    if (!validateForm(form)) return { error: 'Campos requeridos incompletos' };

    const formData = new FormData(form);
    const flatData = Object.fromEntries(formData.entries());
    const data = stripEmptyStrings(unflatten(flatData));

    try {
        const headers = { 'Content-Type': 'application/json' };
        const existingToken = localStorage.getItem('auth_token');
        if (existingToken) headers['Authorization'] = `Bearer ${existingToken}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || 'Error en el servidor');

        if (result.token) {
            localStorage.setItem('auth_token', result.token);
            const userRole = result.role || result.user?.role;
            if (userRole) localStorage.setItem('role', userRole);
            try {
              localStorage.setItem('user_session', JSON.stringify({ isAuthenticated: true, user: { role: userRole }, token: result.token }));
            } catch (e) {}
        }
        
        if (result.redirect) {
            window.location.href = result.redirect;
        } else if (result.token) {
            window.location.href = '/';
        }
        return { success: true, data: result };
    } catch (err) {
        return { error: err.message };
    }
}
// Validación de contraseña + confirmación, compartida entre los dos
// formularios de registro (estudiante e institución). No toca el submit
// existente de cada página -- solo lo bloquea (con e.stopImmediatePropagation)
// si la contraseña no cumple las reglas, dejando pasar el submit normal
// (handleAuthSubmit / app.js) cuando sí las cumple.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 16;

function passwordLengthMessage() {
    return `Tiene que tener al menos ${PASSWORD_MIN} caracteres y máximo ${PASSWORD_MAX}`;
}

export function initPasswordValidation(form) {
    const passwordInput = form.querySelector('input[data-password]');
    const confirmInput = form.querySelector('input[data-password-confirm]');
    if (!passwordInput || !confirmInput) return;

    const passwordError = form.querySelector('[data-password-error]');
    const confirmError = form.querySelector('[data-password-confirm-error]');

    function showError(el, message) {
        if (!el) return;
        el.textContent = message;
        el.style.display = message ? 'block' : 'none';
    }

    function lengthValid() {
        const len = passwordInput.value.length;
        return len >= PASSWORD_MIN && len <= PASSWORD_MAX;
    }

    function matchValid() {
        return confirmInput.value.length > 0 && confirmInput.value === passwordInput.value;
    }

    function validatePasswordField() {
        if (passwordInput.value.length === 0) {
            showError(passwordError, '');
        } else if (!lengthValid()) {
            showError(passwordError, passwordLengthMessage());
        } else {
            showError(passwordError, '');
        }
        validateConfirmField();
    }

    function validateConfirmField() {
        if (confirmInput.value.length === 0) {
            showError(confirmError, '');
        } else if (confirmInput.value !== passwordInput.value) {
            showError(confirmError, 'Su clave no coincide');
        } else {
            showError(confirmError, '');
        }
    }

    passwordInput.addEventListener('input', validatePasswordField);
    confirmInput.addEventListener('input', validateConfirmField);

    // Se registra ANTES que el listener de submit propio de cada página
    // (que se conecta en DOMContentLoaded, después de que este módulo ya
    // corrió), así que corre primero y puede frenar el envío.
    form.addEventListener('submit', (e) => {
        const lenOk = lengthValid();
        const matchOk = matchValid();

        if (!lenOk) showError(passwordError, passwordLengthMessage());
        if (!matchOk) showError(confirmError, 'Su clave no coincide');

        if (!lenOk || !matchOk) {
            e.preventDefault();
            e.stopImmediatePropagation();
            (lenOk ? confirmInput : passwordInput).focus();
        }
    });
}

// Botón de "mostrar/ocultar" contraseña. data-toggle-password="idDelInput"
export function initPasswordToggles(root = document) {
    root.querySelectorAll('[data-toggle-password]').forEach((btn) => {
        const targetId = btn.getAttribute('data-toggle-password');
        const input = document.getElementById(targetId);
        if (!input) return;

        btn.addEventListener('click', () => {
            const showing = input.type === 'text';
            input.type = showing ? 'password' : 'text';
            btn.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
            btn.classList.toggle('is-showing', !showing);
        });
    });
}
