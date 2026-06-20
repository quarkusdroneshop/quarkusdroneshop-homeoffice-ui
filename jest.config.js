module.exports = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  moduleDirectories: ['node_modules', '<rootDir>/src'],

  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    '@app/(.*)': '<rootDir>/src/app/$1',
    '^/package\\.json$': '<rootDir>/package.json',
    // Apollo Client のモック（本番コードと test コードの両方から参照される）
    '^src/apolloclient$': '<rootDir>/src/__mocks__/apolloclient.ts',
    '^src/__mocks__/apolloclient$': '<rootDir>/src/__mocks__/apolloclient.ts',
  },

  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
          noImplicitAny: false,
          strict: false,
        },
        // 既存ソースファイルの型エラーは無視してテストを実行する
        diagnostics: false,
      },
    ],
  },

  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],

  testEnvironment: 'jest-environment-jsdom',

  transformIgnorePatterns: [
    '/node_modules/(?!(@patternfly|d3|internmap|delaunator|robust-predicates|victory|recharts|d3-.*)/)',
  ],

  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};
