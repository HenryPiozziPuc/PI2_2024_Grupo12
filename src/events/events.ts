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
        approved: number,
        status_event: number,
        creator_tokken: number
    };

    async function createEvent(event: Event) {
        const connection = await DataBaseHandler.GetConnection();

        try {
            await connection.execute(
                'INSERT INTO EVENTS (NAME, CATEGORY, FEE, START_DATE, END_DATE, APPROVED, STATUS_EVENT, CREATOR_TOKKEN) VALUES(:name,:category,:fee,:start_date,:end_date,:approved,:status_event,:creator_tokken)',
                [event.name, event.category, event.fee, event.start_date, event.end_date, event.approved, event.status_event, event.creator_tokken]
            );
            await connection.commit();
            return { success: true, message: 'Evento criado com sucesso.' };
        } catch (error) {
            return { success: false, message: 'Erro ao criar evento. Tente novamente mais tarde.' }
        } finally {
            await connection.close();
        }
    }

    export const createEventHandler: RequestHandler = async (req: Request, res: Response) =>{
        const pName = req.get('name');
        const pCategory = req.get('category');
        const pFee = parseInt(req.get('fee') || '');
        const pStart_date = req.get('start_date');
        const pEnd_date = req.get('end_date');
        const pApproved = parseInt(req.get('approved') || '');
        const pCreator_tokken = parseInt(req.get('creator_tokken') || '');

        if(pName && pCategory && !isNaN(pFee) && pStart_date && pEnd_date && !isNaN(pApproved) && !isNaN(pCreator_tokken)){
            const newEvent: Event = {
                name: pName,
                category: pCategory,
                fee: pFee,
                start_date: new Date(pStart_date),
                end_date: new Date (pEnd_date),
                approved: pApproved,
                status_event: 1,
                creator_tokken: pCreator_tokken
            }

            const result = await createEvent(newEvent);

            if(result.success){
                res.status(200).send(result.message);
            }else{
                res.status(400).send(result.message);
            }
        }else{
            res.status(400);
        }
    }

    async function updateEventStatus(eventId: number, newStatus: number) {
        const connection = await DataBaseHandler.GetConnection();

        try {
            const result = await connection.execute(
                'UPDATE EVENTS SET STATUS_EVENT = :newStatus WHERE ID = :eventId',
                { newStatus, eventId }
            );

            await connection.commit();

            // Verifica se alguma linha foi afetada
            if (result.rowsAffected && result.rowsAffected > 0) {
                return { success: true, message: 'Status do evento atualizado com sucesso.' };
            } else {
                return { success: false, message: 'Evento não encontrado.' };
            }
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Erro ao atualizar o status do evento.' };
        } finally {
            await connection.close();
        }
    }

    export const updateEventStatusHandler: RequestHandler = async (req: Request, res: Response) => {
        const eventId = parseInt(req.params.eventId);

        if (!isNaN(eventId)) {
            const result = await updateEventStatus(eventId, 0);

            if (result.success) {
                res.status(200).send(result.message);
            } else {
                res.status(404).send(result.message);
            }
        } else {
            res.status(400).send('ID do evento e novo status são obrigatórios e devem ser números.');
        }
    };

    type EventRow = [string, string, number, Date, Date, number, number, number];

    async function getFilteredEvents(filter: string) {
        const connection = await DataBaseHandler.GetConnection();

        try {
            let query = 'SELECT NAME, CATEGORY, FEE, START_DATE, END_DATE, APPROVED, STATUS_EVENT, CREATOR_TOKKEN FROM EVENTS';
            let conditions: string[] = [];
            let parameters: Record<string, any> = {};

            switch (filter) {
                case 'aguardando_aprovacao':
                    conditions.push('APPROVED = 0');
                    break;
                case 'ja_ocorridos':
                    conditions.push('END_DATE < SYSDATE');
                    break;
                case 'futuros':
                    conditions.push('START_DATE > SYSDATE');
                    break;
                default:
                    throw new Error('Filtro inválido.');
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            const result = await connection.execute<EventRow[]>(query, parameters);

            const events = result.rows?.map(row => ({
                name: row[0],
                category: row[1],
                fee: row[2],
                start_date: row[3],
                end_date: row[4],
                approved: row[5],
                status_event: row[6],
                creator_tokken: row[7]
            })) || [];

            return { success: true, events };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Erro ao buscar eventos.' };
        } finally {
            await connection.close();
        }
    }

    export const getEventsHandler: RequestHandler = async (req: Request, res: Response) => {
        const filter = req.query.filter as string;

        try {
            const result = await getFilteredEvents(filter);

            if (result.success) {
                res.status(200).json(result.events);
            } else {
                res.status(400).send(result.message);
            }
        } catch (error) {
            res.status(400).send("Erro");
        }
    };
}