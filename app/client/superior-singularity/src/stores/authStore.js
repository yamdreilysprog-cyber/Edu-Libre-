import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

// Definimos el store persistente (se guarda en localStorage automáticamente)
export const $auth = persistentAtom('user_session', JSON.stringify({
    isAuthenticated: false,
    user: null,
    token: null
}), {
    encode: JSON.stringify,
    decode: JSON.parse
});

// Helper para actualizar el estado
export function setUser(userData, token) {
    $auth.set(JSON.stringify({
        isAuthenticated: true,
        user: userData,
        token: token
    }));
}

// Helper para logout
export function logout() {
    $auth.set(JSON.stringify({
        isAuthenticated: false,
        user: null,
        token: null
    }));
}
