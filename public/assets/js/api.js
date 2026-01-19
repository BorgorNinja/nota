export class ApiClient {
  constructor({ baseUrl = 'api' } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.csrfToken = null;
    this.authenticated = false;
    this.username = null;
  }

  async initSession() {
    const res = await fetch(`${this.baseUrl}/session.php`, { credentials: 'same-origin' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Session init failed');
    this.csrfToken = data.csrf_token;
    this.authenticated = !!data.authenticated;
    this.username = data.username || null;
    return data;
  }

  async post(path, bodyObj = {}, { requireCsrf = true } = {}) {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (requireCsrf && this.csrfToken) headers['X-CSRF-Token'] = this.csrfToken;

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(bodyObj)) {
      // Allow null -> empty string
      params.append(k, v === null || v === undefined ? '' : String(v));
    }

    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: params.toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      const msg = data.message || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }
}
