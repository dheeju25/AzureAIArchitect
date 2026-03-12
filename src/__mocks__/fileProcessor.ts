export const fileProcessor = {
  processFile: jest.fn().mockResolvedValue({
    content:       Buffer.from('fake-png'),
    format:        'png',
    extractedData: null,
    metadata:      { originalName: 'test.png', dimensions: { width: 800, height: 600 }, pageCount: 1 },
  }),
};
