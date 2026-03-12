export const WebSocketService = {
  getInstance: jest.fn().mockReturnValue({
    emitOverallProgress:  jest.fn(),
    emitAgentStart:       jest.fn(),
    emitAgentComplete:    jest.fn(),
    emitAgentProgress:    jest.fn(),
    emitAgentError:       jest.fn(),
    emitProcessingUpdate: jest.fn(),
  }),
};
