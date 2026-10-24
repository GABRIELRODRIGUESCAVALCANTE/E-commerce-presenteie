import { createAuthClient } from 'better-auth/react';
import { API_URL } from './api/client';

export const authClient = createAuthClient({
  // O Better Auth fica montado em <backend>/api/auth; o cliente precisa apenas da origem do back-end
  baseURL: API_URL.replace(/\/api\/?$/, ''),
});
