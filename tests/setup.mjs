import { request } from '@playwright/test';
import fs from 'node:fs/promises';
export default async function setup() {
    await fs.mkdir('.data', { recursive: true });
    const api = await request.newContext({ baseURL: 'http://127.0.0.1:3002' });
    const response = await api.post('/api/auth/login', { data: { identifier: 'demo_user', password: 'password123' } });
    if (!response.ok()) throw new Error(await response.text());
    await api.storageState({ path: '.data/react-test-session.json' });
    await api.dispose();
}
