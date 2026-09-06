const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  single: jest.fn(),
  maybeSingle: jest.fn(),
  eq: jest.fn(() => mockSupabase),
  ilike: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
};

jest.mock('../config/supabase', () => mockSupabase);

const app = require('../index');

describe('API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  test('POST /api/auth/register rejects invalid payload', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bademail', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Validación fallida');
  });

  test('POST /api/auth/register creates a new student account', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 1, name: 'Test User', email: 'test@example.com', role: 'STUDENT', plan: 'FREE' },
      error: null
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'Password123!' });

    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.role).toBe('STUDENT');
    expect(response.body.token).toBeDefined();
  });

  test('POST /api/auth/create-user rejects non-admin users', async () => {
    const token = jwt.sign({ userId: 1, role: 'STUDENT' }, process.env.JWT_SECRET);

    const response = await request(app)
      .post('/api/auth/create-user')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad User', email: 'bad@example.com', password: 'Password123!', role: 'ADMIN' });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Acceso prohibido');
  });

  test('POST /api/auth/create-user allows admin users', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 2, name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', plan: 'FREE' },
      error: null
    });

    const token = jwt.sign({ userId: 1, role: 'ADMIN' }, process.env.JWT_SECRET);

    const response = await request(app)
      .post('/api/auth/create-user')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Admin User', email: 'admin@example.com', password: 'Password123!', role: 'ADMIN' });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('ADMIN');
    expect(response.body.user.email).toBe('admin@example.com');
  });

  test('GET /api/institutions rejects invalid pagination parameters', async () => {
    const response = await request(app).get('/api/institutions?page=0&limit=999');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Validación de query fallida');
  });

  test('GET /api/programs rejects invalid limit parameter', async () => {
    const response = await request(app).get('/api/programs?limit=-1');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Validación de query fallida');
  });
});
