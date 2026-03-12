export const tracingService = {
  startTrace:    jest.fn().mockResolvedValue({ span: { setAttributes: jest.fn() }, traceId: 'mock-trace-id' }),
  endTrace:      jest.fn().mockResolvedValue(undefined),
  traceAgentCall: jest.fn().mockImplementation((_a: any, _b: any, _c: any, _d: any, fn: any) => fn()),
};
