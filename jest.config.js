// jest.config.js (Otimização Final)

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Use o preset ts-jest que já lida com a maior parte da transpilação
  preset: 'ts-jest', 
  testEnvironment: 'node', 
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'], 
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
  
  // ⭐️ ÚLTIMA TENTATIVA DE FORÇAR O PARSER TS-JEST (IGNORAR BABEL na sintaxe) ⭐️
  globals: {
    'ts-jest': {
      // Usa seu tsconfig.json principal
      tsconfig: 'tsconfig.json',
      // Módulo isolado, o que acelera a transpilação e, crucialmente,
      // resolve problemas de parser como o 'as jest.Mock'.
      isolatedModules: true,
    },
  },
  // Remove o 'transform' explícito anterior para confiar no 'preset' e 'globals'

  collectCoverage: false, 
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/routes/**/*.ts',
    'src/middleware/**/*.ts',
    '!src/index.ts', 
    '!src/db.ts', 
    '!src/utils/**/*.ts'
  ],
};