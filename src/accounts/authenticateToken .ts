import { Request, Response, NextFunction } from 'express';
import { DataBaseHandler } from '../DB/connection';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.get('Authorization')?.split(' ')[1]; // Extrai o token do cabeçalho 'Authorization'

    if (!token) {
        return res.sendStatus(401); // Não autorizado
    }

    const connection = await DataBaseHandler.GetConnection();
    try {
        const result = await connection.execute(
            'SELECT * FROM ACCOUNTS WHERE TOKEN = :token',
            [token]
        );

        const rows: string[][] = result.rows as string[][];

        if (rows && rows.length > 0) {
            req.user = { email: rows[0][2], // ou qualquer outra informação relevante
                          role: rows[0][6] }; // Supondo que você tem uma coluna ROLE na tabela
            next();
        } else {
            return res.sendStatus(403); // Proibido
        }
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        return res.sendStatus(500); // Erro interno do servidor
    } finally {
        await connection.close();
    }
};
