import { Request, Response, NextFunction } from 'express';
import { authorizationService } from '../services/authorization.service';

export const authorizeBoard = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    
    const boardId = parseInt(
        req.params.id ||
        req.params.boardId ||
        req.body.boardId
    );

    if (isNaN(boardId)) {
        
        res.status(400).json({ error: 'Bad Request', message: 'Invalid or missing board ID in request' });
        return;
    }

    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
        return;
    }

    try {
        const hasAccess = await authorizationService.canAccessBoard(boardId, req.user.userId);

        if (!hasAccess) {
            res.status(403).json({ error: 'Forbidden', message: 'Access denied: You do not own this board' });
            return;
        }

        next();
    } catch (error) {
        console.error('Authorization error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Authorization check failed' });
    }
};

export const authorizeList = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const listId = parseInt(
        req.params.id ||
        req.params.listId ||
        req.body.listId
    );

    if (isNaN(listId)) {
        res.status(400).json({ error: 'Bad Request', message: 'Invalid or missing list ID' });
        return;
    }

    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
        return;
    }

    try {
        const hasAccess = await authorizationService.canAccessList(listId, req.user.userId);

        if (!hasAccess) {
            res.status(403).json({ error: 'Forbidden', message: 'Access denied: You do not own the board containing this list' });
            return;
        }

        next();
    } catch (error) {
        console.error('Authorization error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Authorization check failed' });
    }
};

export const authorizeCard = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const cardId = parseInt(
        req.params.id ||
        req.params.cardId ||
        req.body.cardId
    );

    if (isNaN(cardId)) {
        res.status(400).json({ error: 'Bad Request', message: 'Invalid or missing card ID' });
        return;
    }

    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
        return;
    }

    try {
        const hasAccess = await authorizationService.canAccessCard(cardId, req.user.userId);

        if (!hasAccess) {
            res.status(403).json({ error: 'Forbidden', message: 'Access denied: You do not own the board containing this card' });
            return;
        }

        next();
    } catch (error) {
        console.error('Authorization error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Authorization check failed' });
    }
};
