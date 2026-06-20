const mockClient = {
  query: jest.fn().mockResolvedValue({ data: { mockerPaused: false } }),
  mutate: jest.fn().mockResolvedValue({ data: { mockerTogglePause: true } }),
  watchQuery: jest.fn(),
};

export default mockClient;
