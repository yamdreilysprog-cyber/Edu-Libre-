(function () {
  function buildApiUrl(path) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  function setFormStatus(form, message, type) {
    const status = form?.querySelector('[data-form-status]');
    if (!status) return;

    status.textContent = message || '';
    status.className = `form-status ${type || ''}`.trim();
  }

  function normalizeRegisterPayload(formData) {
    const payload = Object.fromEntries(formData.entries());

    const nombre = (payload.nombre || '').toString().trim();
    const apellido = (payload.apellido || '').toString().trim();
    if (nombre || apellido) {
      payload.name = [nombre, apellido].filter(Boolean).join(' ').trim();
    }

    // NO eliminamos nombre/apellido para asegurar compatibilidad
    // delete payload.nombre;
    // delete payload.apellido;
    delete payload.terms;

    return payload;
  }

  async function submitForm(form, endpoint, redirectTo) {
    if (!form) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || 'Enviar';
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';
    setFormStatus(form, '', '');

    const formData = new FormData(form);
    const payload = form.id === 'register-form'
      ? normalizeRegisterPayload(formData)
      : Object.fromEntries(formData.entries());

    try {
      const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || result.message || 'No se pudo completar la solicitud.');
      }

      if (result.token) {
        console.debug('[Auth] submitForm received result', result);
        console.debug('[Auth] login returned token');
        localStorage.setItem('auth_token', result.token);
        // store role if present in response
        const roleToStore = result.role || result.user?.role || result.data?.role;
        if (roleToStore) {
          console.debug('[Auth] storing role', roleToStore);
          localStorage.setItem('role', roleToStore);
        } else {
          console.debug('[Auth] no role returned by API');
        }
        try { localStorage.setItem('user_session', JSON.stringify({ isAuthenticated: true, user: { role: roleToStore }, token: result.token })); } catch(e){}
      }

      setFormStatus(form, result.message || 'Operación realizada correctamente.', 'success');

      // Solo redirigimos automáticamente si el backend devolvió un token
      // (o sea, si de verdad quedó una sesión iniciada). register() nunca
      // manda token -- requiere verificar el email primero -- así que sin
      // este guard se redirigía igual al panel del estudiante aunque nunca
      // hubiera sesión, tapando el mensaje de "revisa tu correo".
      const role = result.user?.role || result.role || result.data?.role;
      let finalRedirect = redirectTo;

      if (result.token) {
        if (!finalRedirect && role === 'STUDENT') {
          finalRedirect = '/estudiante/panel';
        } else if (!finalRedirect && role === 'INSTITUTION') {
          finalRedirect = '/institucion/dashboard';
        } else if (!finalRedirect) {
          finalRedirect = '/';
        }
      }

      if (finalRedirect) {
        window.setTimeout(() => {
          window.location.href = finalRedirect;
        }, 800);
      }
    } catch (error) {
      setFormStatus(form, error.message || 'Ocurrió un error inesperado.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  function attachAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    loginForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      submitForm(loginForm, '/api/auth/login');
    });

    registerForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      submitForm(registerForm, '/api/auth/register');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachAuthForms);
  } else {
    attachAuthForms();
  }
})();
