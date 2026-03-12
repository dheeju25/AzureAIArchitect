export const traceQueryService = {
  queryTraces:    jest.fn().mockResolvedValue({ traces: [], totalCount: 0, hasMore: false }),
  getTraceDetails: jest.fn().mockResolvedValue(null),
  getTraceMetrics: jest.fn().mockResolvedValue({}),
};
