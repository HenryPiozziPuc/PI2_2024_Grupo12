import {Request, RequestHandler, Response} from "express";
import OracleDB, { oracleClientVersion } from "oracledb";
import { FinancialHandler } from "./financial/financial";
import { EventsHandler } from "./events/events";


export namespace BetsHandler {
    {
        export type Bet = {
            CPF: string;
            amount: number
            eventId: string;
            option: number;
        }
    }

    export async function betOnEvent(req: Request, res: Response) {
        const { CPF, amount, eventId } = req.body;
        

        const event = EventsHandler.findEventById(eventId);
        if (!event) {
            return res.status(400).json({ message: "Evento inválido." });
        }

        const Balance = await FinancialHandler.getBalance(CPF);
        if (Balance < amount) {
            return res.status(400).json({ message: "Saldo insuficiente." });
        }

        const newBalance = await FinancialHandler.withdrawFunds(CPF, amount);

        const connection = await OracleDB.getConnection();
        try {
            await connection.execute(
                'INSERT INTO Bets (CPF, eventId, amount, option) VALUES (:CPF, :eventId, :amount, :option)',
                { CPF, eventId, amount },
                { autoCommit: true }
            );
            res.status(200).json({ message: "Aposta registrada!", event: event.name })
        }   catch (error) {
                await connection.rollback();
                res.status(500).json({ message: "Erro ao registrar a aposta." });
        } finally {
            await connection.close();
        }

        if (event.statusEvent === option) {
            const winnings = amount * event.oddsMultiplier; 
            await FinancialHandler.addFunds(CPF, winnings);
            res.status(200).json({
                message: "Você ganhou a aposta!",
                winnings: winnings,
                finalBalance: Balance + winnings
            });
        } else {
            res.status(200).json({ message: "Você perdeu a aposta!" });
        }
    
    }
}
