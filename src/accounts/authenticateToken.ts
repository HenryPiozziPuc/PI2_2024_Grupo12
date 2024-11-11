import { Request, Response, NextFunction } from 'express';
import { DataBaseHandler } from '../DB/connection';

// Middleware de autenticação
export namespace AuthenticateTokenManager {
    
    export const AuthenticateTokenHandler = async (req: Request, res: Response) => {
        const token = req.cookies.authToken; // Ou  dependendo de onde o token está
    
        if (!token) {
            return res.status(401).send('Sessão expirada ou inexiste!');
        }

        const connection = await DataBaseHandler.GetConnection();

        try {
            // Execute a consulta para verificar o token
            const result = await connection.execute(
                'SELECT * FROM ACCOUNTS WHERE TOKEN = :token',
                [token]
            );
            const rows: any[][] = result.rows as any[][];

            // Verifique se a consulta retornou resultados
            if (!rows || rows.length === 0) {
                return res.status(401).send(`Token inválido, nenhuma conta referente a: ${token}`);
            }

        } catch (error) {
            console.error('Erro ao autenticar o token:', error);
            return res.status(500).send('Falha ao autenticar o token');
        } 
    }

}
