import {Request, RequestHandler, Response} from "express";
import { DataBaseHandler } from "../DB/connection";
import OracleDB, { oracleClientVersion } from "oracledb";

export namespace EventsManager {

    export type Event = {
        name: string,
        category: string,
        fee: number,
        start_date: Date,
        end_date: Date,
        approved: boolean,
        status_event: boolean
    };

    // /addNewEvent
    export const addNewEvent: RequestHandler = async (req: Request, res: Response) => {
        const { name, category, fee, startDate, endDate } = req.body;
    
        if (!name || !category || !fee || !startDate || !endDate) {
            res.status(400).json({ message: "Parâmetros de evento inválidos." });
            return;  // Agora estamos usando `return` para encerrar a função após enviar a resposta
        }
    
        // Convertendo variáveis para tipos corretos e validando datas
        const parsedFee = Number(fee);
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
    
        if (isNaN(parsedFee) || isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            res.status(400).json({ message: "Parâmetros de evento com tipos inválidos." });
            return;
        }
    
        const connection = await DataBaseHandler.GetConnection();
        try {
            
            await connection.execute(
                `INSERT INTO EVENTS (NAME, CATEGORY, FEE, START_DATE, END_DATE, APPROVED, REMOVED) 
                 VALUES (:name, :category, :fee, :startDate, :endDate, :approved, :removed)`,
                {
                    name,
                    category,
                    fee: parsedFee,
                    startDate: parsedStartDate,
                    endDate: parsedEndDate,
                    approved: 0,   // false como 0
                    removed: 0     // false como 0
                },
                { autoCommit: true }
            );
    
            res.status(201).json({ message: `Evento "${name}" criado com sucesso e aguardando aprovação.` });
        } catch (error) {
            console.error("Erro ao criar evento:", error);
            res.status(500).json({ message: "Erro ao criar evento.", error });
        } finally {
            if (connection) await connection.close();
        }
    }

    // /getEvents
    export const getEvents: RequestHandler = async (req, res) => {
        const { status } = req.query;
        let query = "SELECT * FROM EVENTS WHERE REMOVED = 0";
        if (status === "approved") query += " AND APPROVED = 1";
        else if (status === "pending") query += " AND APPROVED = 0";

        const connection = await DataBaseHandler.GetConnection();
        try {
            const result = await connection.execute(query);
            res.status(200).json(result.rows);
        } catch (error) {
            console.error("Erro ao obter eventos:", error);
            res.status(500).json({ message: "Erro ao obter eventos.", error });
        } finally {
            if (connection) await connection.close();
        }
    }

    // /deleteEvent
    export const deleteEvent: RequestHandler = async (req: Request, res: Response) => {
        const eventId = parseInt(req.params.id);
    
        if (isNaN(eventId)) {
            res.status(400).json({ message: "ID inválido." });
            return;
        }
    
        const connection = await DataBaseHandler.GetConnection();
        try {
            const result = await connection.execute(
                `UPDATE EVENTS SET REMOVED = 1 WHERE ID = :id AND APPROVED = 0`,
                { id: eventId },
                { autoCommit: true }
            );
    
            if (result.rowsAffected) {
                res.status(200).json({ message: `Evento com ID ${eventId} marcado como removido.` });
            } else {
                res.status(404).json({ message: `Evento com ID ${eventId} não encontrado ou já aprovado.` });
            }
        } catch (error) {
            console.error("Erro ao remover evento:", error);
            res.status(500).json({ message: "Erro ao remover evento.", error });
        } finally {
            if (connection) await connection.close();
        }
    }

    // Avaliação de evento (aprovação ou rejeição) /evaluateNewEvent
    export const evaluateNewEvent: RequestHandler = async (req, res) => {
        const eventId = parseInt(req.params.id);
        const { approved } = req.body;

        if (isNaN(eventId) || approved === undefined) {
            res.status(400).json({ message: "Parâmetros de avaliação inválidos." });
            return;
        }

        const connection = await DataBaseHandler.GetConnection();
        try {
            const result = await connection.execute(
                `UPDATE EVENTS SET APPROVED = :approved WHERE ID = :id`,
                { approved: approved ? 1 : 0, id: eventId },
                { autoCommit: true }
            );

            if (result.rowsAffected) {
                const status = approved ? "aprovado" : "rejeitado";
                res.status(200).json({ message: `Evento com ID ${eventId} foi ${status}.` });
            } else {
                res.status(404).json({ message: `Evento com ID ${eventId} não encontrado.` });
            }
        } catch (error) {
            console.error("Erro ao avaliar evento:", error);
            res.status(500).json({ message: "Erro ao avaliar evento.", error });
        } finally {
            if (connection) await connection.close();
        }
    }
}