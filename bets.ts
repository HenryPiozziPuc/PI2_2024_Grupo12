import { Request, Response } from "express";
import OracleDB from "oracledb";
import { FinancialHandler } from "./financial/financial";
import { EventsHandler } from "./events/events";

export namespace BetsHandler {
    export type Bet = {
        email: string; 
        amount: number;
        eventId: string;
        choice: number;  
    };
}

// Função para registrar uma aposta.
export async function placeBet(req: Request, res: Response) {
    const { email, amount, eventId, choice } = req.body; 

    OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

    let connection;
    try {
        connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR,
        });

        // Verifica se o token associado ao email existe.
        const tokenResult = await connection.execute(
            'SELECT TOKEN FROM Users WHERE email = :email', 
            { email }
        );

        const token = tokenResult.rows[0]?.TOKEN;
        if (token === null) { 
            return res.status(400).json({ message: "Token inválido ou inexistente." });
        }

        // Verifica se o evento existe.
        const event = EventsHandler.findEventById(eventId);
        if (!event) {
            return res.status(400).json({ message: "Evento inválido." });
        }

        // Obtém o saldo do apostador e verifica se é maior que a taxa mínima.
        const balance = await FinancialHandler.getBalance(email); 
        if (balance < event.fee) {
            return res.status(400).json({
                message: "Saldo insuficiente..",
            });
        }

        // Verifica se a aposta é maior do que a taxa mínima.
        if (amount < event.fee) {
            return res.status(400).json({
                message: `A aposta deve ser maior que a taxa mínima de R$${event.fee}.`,
            });
        }


        // Obtém o saldo do apostador e verifica se é suficiente para a aposta.
        if (balance < amount) {
            return res.status(400).json({ message: "Saldo insuficiente." });
        }

        // Insere a nova aposta no banco de dados.
        await connection.execute(
            'INSERT INTO Bets (email, eventId, amount, choice) VALUES (:email, :eventId, :amount, :choice)', 
            { email, eventId, amount, choice },
            { autoCommit: true }
        );

        await FinancialHandler.withdrawFunds(email, amount); 

        res.status(200).json({
            message: "Aposta registrada!",
            event: event.name,
        });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Erro ao registrar a aposta." });
    } finally {
        if (connection) await connection.close();
    }
}

// Função para processar o resultado das apostas de um evento.
export async function processBetResult(req: Request, res: Response) {
    const { eventId } = req.body;
    let connection;

    try {
        connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR,
        });

        // Verifica se o evento existe.
        const event = EventsHandler.findEventById(eventId);
        if (!event) {
            return res.status(400).json({ message: "Evento inválido." });
        }

        // Seleciona as apostas vencedoras.
        const winningBets = await connection.execute(
            'SELECT email, amount FROM Bets WHERE eventId = :eventId AND choice = :choice', 
            { eventId, choice: event.statusEvent }
        );

        // Seleciona as apostas perdedoras.
        const losingBets = await connection.execute(
            'SELECT amount FROM Bets WHERE eventId = :eventId AND choice != :choice',
            { eventId, choice: event.statusEvent }
        );

        // Calcula a aposta total das apostas vencedoras e perdedoras.
        const totalWinningAmount = winningBets.rows.reduce((total, bet) => total + bet.amount, 0);
        const totalLosingAmount = losingBets.rows.reduce((total, bet) => total + bet.amount, 0);

        // Para cada aposta vencedora, calcula e credita os ganhos proporcionais.
        for (const bet of winningBets.rows) {
            const proportionalWinnings = bet.amount + (bet.amount / totalWinningAmount) * totalLosingAmount;
            await FinancialHandler.addFunds(bet.email, proportionalWinnings); 
        }
    } catch (error) {
        console.error("Erro ao processar o resultado do evento:", error);
    } finally {
        if (connection) await connection.close();
    }
}
