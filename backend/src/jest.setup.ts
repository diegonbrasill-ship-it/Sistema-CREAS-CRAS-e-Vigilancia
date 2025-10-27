// backend/src/jest.setup.ts

// Mock do JWT para que o authMiddleware sempre retorne um usuário válido
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({ 
    id: 1, 
    username: 'testuser', 
    role: 'gestor', 
    unit_id: 1 // Usuário Gestor padrão para a maioria dos testes
  })),
}));