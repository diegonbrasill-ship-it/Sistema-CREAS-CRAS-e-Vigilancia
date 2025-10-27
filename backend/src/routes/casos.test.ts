// backend/src/routes/casos.test.ts

import request from 'supertest';
import app from '../app';
// ⭐️ CORREÇÃO FINAL: Importamos como 'pool' mas o tratamos como 'any' localmente.
import pool from '../db'; 

// Mocka o módulo 'pg' e a função pool.query
jest.mock('../db', () => ({
  initDb: jest.fn().mockResolvedValue({ connect: jest.fn() }),
  default: {
    // A função query é mockada e será usada como jest.Mock
    query: jest.fn(), 
    connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
  },
}));

// Mock do logAction para evitar erros
jest.mock('../services/logger', () => ({
  logAction: jest.fn(),
}));

// Mocka usuários para simulação (Mantidos, mas não usados no código abaixo)
const MOCK_USER_GESTOR = {
  id: 1,
  username: 'gestor.test',
  role: 'gestor',
  unit_id: null,
};

const MOCK_USER_CRAS_3 = {
  id: 10,
  username: 'servidor.cras3',
  role: 'servidor',
  unit_id: 3,
};

const MOCK_VALID_TOKEN = 'Bearer VALID_TEST_TOKEN'; 

describe('Testes de Integração de Casos (Segurança e Persistência)', () => {
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =======================================================================
  // TESTE 1: PERSISTÊNCIA DE DADOS VAZIOS (Risco C) - ROTA POST /casos
  // =======================================================================
  test('POST /casos deve persistir campos vazios ("") como NULL no JSONB', async () => {
    
    const expectedCasoId = 999;
    
    // ⭐️ SOLUÇÃO FINAL: Atribuímos o mock.query a uma variável e fazemos o cast dela,
    // eliminando a sintaxe const/type assertion complexa que o Babel quebra.
    const mockDb = pool as any;
    const mockQuery = mockDb.default.query as jest.Mock;
    
    mockQuery.mockImplementation((query: string, params: any[]) => {
      // Verifica o JSONB antes de simular o retorno
      const receivedJsonb = JSON.parse(params[6]); 
      
      // ASSERÇÃO CRÍTICA DO RISCO C
      expect(receivedJsonb.nis).toBeNull(); 
      expect(receivedJsonb.idade).toBeNull(); 
      expect(receivedJsonb.sexo).toBe('Feminino'); 

      return Promise.resolve({
        rows: [{
          id: expectedCasoId,
          nome: params[0],
          dataCad: params[1],
          tecRef: params[2],
          status: params[3],
          unit_id: params[4],
          userId: params[5],
          dados_completos: receivedJsonb,
        }],
        rowCount: 1
      });
    });
    
    const casoData = {
      nome: 'Vítima Teste Null',
      tecRef: 'Tecn. Teste',
      nis: '',
      idade: '',
      sexo: 'Feminino',
    };

    const response = await request(app)
      .post('/api/casos')
      .set('Authorization', MOCK_VALID_TOKEN) 
      .send(casoData);

    expect(response.statusCode).toBe(201);
    expect(response.body.nis).toBeNull(); 
    expect(response.body.idade).toBeNull();
  });


  // =======================================================================
  // TESTE 2: SEGURANÇA NA LISTAGEM (Risco A) - ROTA GET /casos
  // =======================================================================
  test('GET /casos deve restringir acesso de Servidor Comum à sua própria unit_id e casos NULL', async () => {
    
    // ⭐️ SOLUÇÃO FINAL: Declaramos o mock separadamente 
    const mockDb = pool as any;
    const servicosQueryMock = mockDb.default.query as jest.Mock; 
    
    servicosQueryMock.mockImplementation((query: string, params: any[]) => {
      return Promise.resolve({ rows: [], rowCount: 0 }); 
    });
    
    await request(app)
      .get('/api/casos?status=Ativo')
      .set('Authorization', MOCK_VALID_TOKEN);
      
    // Encontra a chamada da query principal (SELECT...)
    const chamada = servicosQueryMock.mock.calls.find((call: any[]) => call[0].includes('SELECT id, "dataCad"'));
    
    if (!chamada) {
        throw new Error("Não foi possível encontrar a query de seleção principal no mock.");
    }
    
    const queryEnviada = chamada[0] as string;
    const paramsEnviados = chamada[1] as any[];

    // Asserção Crítica: O filtro de unidade deve estar presente na query.
    expect(queryEnviada).toContain('AND (casos.unit_id = $2 OR casos.unit_id IS NULL)');
  });

});