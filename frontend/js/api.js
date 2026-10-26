/**
 * Thin fetch wrapper for the Node/Express backend. All endpoints live under /api
 * and authenticate with an httpOnly session cookie.
 */
export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

async function request(method, url, body) {
    const options = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (body instanceof FormData) {
        options.body = body;
    } else if (body !== undefined) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(`/api${url}`, options);
    } catch {
        throw new ApiError(0, "Can't reach the server. Is it running?");
    }

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    if (!response.ok) {
        throw new ApiError(response.status, data?.error || `Request failed (${response.status})`);
    }
    return data;
}

export const api = {
    get: (url) => request('GET', url),
    post: (url, body = {}) => request('POST', url, body),
    patch: (url, body = {}) => request('PATCH', url, body),
    del: (url, body) => request('DELETE', url, body)
};

export function uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    return request('POST', '/uploads', form);
}
