export function saveSession({ token, user, role }) {
  if (!token) return;
  const userRole = role || user?.role || 'STUDENT';
  
  try {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('role', userRole);
    localStorage.setItem('user_session', JSON.stringify({
      isAuthenticated: true,
      user: user || { role: userRole },
      token
    }));
  } catch (e) {
    console.error('Error saving session in localStorage', e);
  }

  try {
    document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `user_role=${encodeURIComponent(userRole)}; path=/; max-age=2592000; SameSite=Lax`;
  } catch (e) {
    console.error('Error setting session cookie', e);
  }
}

export function getSession() {
  let token = null;
  let role = null;
  let user = null;

  try {
    token = localStorage.getItem('auth_token');
    role = localStorage.getItem('role');
    const rawSession = localStorage.getItem('user_session');
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (!token && parsed?.token) token = parsed.token;
      if (!role && (parsed?.user?.role || parsed?.role)) role = parsed.user?.role || parsed.role;
      if (parsed?.user) user = parsed.user;
    }
  } catch (e) {}

  if (!token) {
    try {
      const cookieMatch = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
      if (cookieMatch) token = decodeURIComponent(cookieMatch[1]);
      const roleMatch = document.cookie.match(/(?:^|;\s*)user_role=([^;]+)/);
      if (roleMatch) role = decodeURIComponent(roleMatch[1]);
    } catch (e) {}
  }

  if (token && role) {
    try {
      if (!localStorage.getItem('auth_token')) localStorage.setItem('auth_token', token);
      if (!localStorage.getItem('role')) localStorage.setItem('role', role);
      if (!localStorage.getItem('user_session')) {
        localStorage.setItem('user_session', JSON.stringify({
          isAuthenticated: true,
          user: user || { role },
          token
        }));
      }
    } catch (e) {}
  }

  return {
    token,
    role,
    user,
    isAuthenticated: Boolean(token)
  };
}

export function clearSession() {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_session');
  } catch (e) {}

  try {
    document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'user_role=; path=/; max-age=0; SameSite=Lax';
  } catch (e) {}
}
