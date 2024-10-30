import {Request, RequestHandler, Response} from "express";
import OracleDB, { oracleClientVersion } from "oracledb";
import { FinancialHandler } from "./financial/financial";
import { EventsHandler } from "./events/events";


export namespace BetsHandler {
    
        export type Bet = {
            CPF: string;
            amount: number
            eventId: string;
            option: number;
        }
    }

export async function betOnEvent(req: Request, res: Response) {
   
    OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        // 1 abrir conexao, 2 fazer selecet, 3 fechar conexao, 4 retornar os dados
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString:process.env.ORACLE_CONN_STR
        });

    const { CPF, amount, eventId } = req.body;
    
    

    const event = EventsHandler.findEventById(eventId);
    if (!event) {
        return res.status(400).json({ message: "Evento inválido." });
    }

    if (amount < event.fee) {
        return res.status(400).json({ 
            message: "A aposta deve ser maior que a taxa mínima de R${event.fee}." 
        });
    }

    const Balance = await FinancialHandler.getBalance(CPF);
    if (Balance < amount) {
        return res.status(400).json({ message: "Saldo insuficiente." });
    }


    try {
        await connection.execute(
            'INSERT INTO Bets (CPF, eventId, amount, option) VALUES (:CPF, :eventId, :amount, :option)',
            { CPF, eventId, amount },
            { autoCommit: true }
        );

        const newBalance = await FinancialHandler.withdrawFunds(CPF, amount);

        res.status(200).json({ 
            message: "Aposta registrada!",
             event: event.name 
        });

    }   catch (error) {
            await connection.rollback();
            res.status(500).json({ 
                message: "Erro ao registrar a aposta." 
        });
    } 
    finally {
        await connection.close();
    }

    if (event.statusEvent === option) { 
        const winningBets = await connection.execute(
            'SELECT CPF, amount FROM Bets WHERE eventId = :eventId AND option = :option',
            { eventId: eventId, option: event.statusEvent } 
        );
    
        const losingBets = await connection.execute(
            'SELECT amount FROM Bets WHERE eventId = :eventId AND option != :option',
            { eventId: eventId, option: event.statusEvent } 
        );
    
        
        const totalWinningAmount = winningBets.rows.reduce((total, bet) => total + bet.amount, 0);
        const totalLosingAmount = losingBets.rows.reduce((total, bet) => total + bet.amount, 0);
    
        for (const bet of winningBets.rows) {
            const proportionalWinnings = bet.amount + (bet.amount / totalWinningAmount) * totalLosingAmount;
    
            await FinancialHandler.addFunds(bet.CPF, proportionalWinnings);
    
            if (bet.CPF === CPF) {
                res.status(200).json({
                    message: "Você ganhou a aposta!",
                    winnings: proportionalWinnings,
                    finalBalance: Balance + proportionalWinnings
                });
            }
        }
    } else {
        res.status(200).json({ 
            message: "Você perdeu a aposta." 
        });
    }
    

}

