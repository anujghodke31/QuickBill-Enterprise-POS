const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Mock DB connection to avoid connecting during tests
jest.mock('../config/db', () => jest.fn());

// Ensure client/dist/index.html exists for the catch-all route
const clientDist = path.join(__dirname, '../../client/dist');
const indexHtml = path.join(clientDist, 'index.html');
let createdMockFile = false;

beforeAll(() => {
  if (!fs.existsSync(clientDist)) {
    fs.mkdirSync(clientDist, { recursive: true });
  }
  if (!fs.existsSync(indexHtml)) {
    fs.writeFileSync(indexHtml, '<html><body>Mock App</body></html>');
    createdMockFile = true;
  }
});

afterAll(() => {
  // Clean up if we created the mock file
  if (createdMockFile) {
    // Ideally clean up, but keeping it might be useful for local dev if empty.
    // For now, let's leave it or remove it.
    try {
      if (fs.readFileSync(indexHtml, 'utf8') === '<html><body>Mock App</body></html>') {
        fs.unlinkSync(indexHtml);
        // Verify if dir is empty before removing? No need to overcomplicate.
      }
    } catch {
      // Ignore
    }
  }
});

const app = require('../index');

describe('Server', () => {
  it('GET / should serve the frontend', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.type).toBe('text/html');
  });

  it('GET /health (non-existent) should return frontend or 404 depending on config', async () => {
    // Since catch-all returns index.html, anything not matching API routes returns 200
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.type).toBe('text/html');
  });
});
