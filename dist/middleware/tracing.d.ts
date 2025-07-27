import { Request, Response, NextFunction } from 'express';
export interface TracedRequest extends Request {
    traceId: string;
}
export declare const tracingMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=tracing.d.ts.map