import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {

    const start = Date.now()
    res.on("finish", () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const success = status > 400 ? "✅" : "❌";
        const body = Object.keys(req.body).length ? JSON.stringify(req.body) : "{}";
        console.log(
            `[${success}] ${req.method} ${req.originalUrl} - ${status} (${duration}ms) | body: ${body}`
        );

    });
}
