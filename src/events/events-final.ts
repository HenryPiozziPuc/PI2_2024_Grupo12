import {Request, RequestHandler, Response} from "express";
import { DataBaseHandler } from "../DB/connection";
import nodemailer from 'nodemailer';

export namespace EventsManager {

    // Type para representar um evento
    export type Event = {
        name: string,
        category: string,
        fee: number,
        start_date: Date,
        end_date: Date,
        approved: number,
        status_event: number,
        creator_CPF: number
    };

    type EventRow = [string, string, number, Date, Date, number, number, number];
    
    /* AddNewEvent Funcionando */
    async function addNewEvent(event: Event) {
        const connection = await DataBaseHandler.GetConnection();
        try {
            await connection.execute(
                'INSERT INTO EVENTS (ID, NAME, CATEGORY, FEE, START_DATE, END_DATE, APPROVED, STATUS_EVENT, CPF) VALUES(SEQ_EVENTS.NEXTVAL, :name,:category,:fee,:start_date,:end_date,:approved,:status_event,:creator_CPF)',
                [event.name, event.category, event.fee, event.start_date, event.end_date, event.approved, event.status_event, event.creator_CPF]
            );
            await connection.commit();
            return { success: true, message: 'Evento criado com sucesso.' };
        } catch (error) {
            console.error('Erro ao criar evento:', error);
            return { success: false, message: 'Erro ao criar evento. Tente novamente mais tarde.' }
        } finally {
            await connection.close();
        }
    }

    /* AddNewEventHandler Funcionando */
    export const addNewEventHandler: RequestHandler = async (req: Request, res: Response) =>{
        const pName = req.get('name');
        const pCategory = req.get('category');
        const pFee = parseInt(req.get('fee') || '');
        const pStart_date = req.get('start_date');
        const pEnd_date = req.get('end_date');
        const pCreator_CPF = parseInt(req.get('creator_CPF') || '');

        if(pName && pCategory && !isNaN(pFee) && pStart_date && pEnd_date && !isNaN(pCreator_CPF)){
            const newEvent: Event = {
                name: pName,
                category: pCategory,
                fee: pFee,
                start_date: new Date(pStart_date),
                end_date: new Date (pEnd_date),
                approved: 0,
                status_event: 1,
                creator_CPF: pCreator_CPF
            }

            const result = await addNewEvent(newEvent);

            if (result.success) {
                res.status(200).send(result.message);
            } else {
                res.status(400).send(result.message);
            }
        } else{
            res.status(400);
        }
    }

    /* getFilteredEvents Funcionando */
    async function getFilteredEvents(filter: string) {
        const connection = await DataBaseHandler.GetConnection();

        try {
            let query = 'SELECT * FROM EVENTS';
            let conditions: string[] = [];
            let parameters: Record<string, any> = {};

            switch (filter) {
                case 'aguardando_aprovacao':
                    conditions.push('APPROVED = 0');
                    break;
                case 'ja_ocorridos':
                    conditions.push('END_DATE < SYSDATE AND APPROVED = 1');
                    break;
                case 'futuros':
                    conditions.push('START_DATE > SYSDATE AND APPROVED = 1');
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

    /* getEventsHandler Funcionando */
    export const getEventsHandler: RequestHandler = async (req: Request, res: Response) => {
        const filter = req.get('filter');

        try {
            if (filter) {
                const result = await getFilteredEvents(filter);
                if (result.success) {
                    res.status(200).json(result.events);
                } else {
                    res.status(400).send(result.message);
                }
            }
                
            
        } catch (error) {
            res.status(400).send("Erro");
        }
    };

    /* updateEventStatus funcionando */
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

    /* updateEventStatusHandler funcionando */
    export const updateEventStatusHandler: RequestHandler = async (req: Request, res: Response) => {
        const pID = parseInt(req.get('id') || '', 10);

        if (pID) {
            const result = await updateEventStatus(pID, 0);

            if (result.success) {
                res.status(200).send(result.message);
            } else {
                res.status(404).send(result.message);
            }
        } else {
            res.status(400).send('ID do evento e novo status são obrigatórios e devem ser números.');
        }
    };

    async function sendRejectionEmail(to: string) {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        
    
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject: 'Evento Reprovado',
            text: `Infelizmente, o seu evento foi reprovado. Entre em contato para mais informações.`
        };
    
        try {
            await transporter.sendMail(mailOptions);
            console.log(`E-mail de reprovação enviado para: ${to}`);
        } catch (error) {
            console.error("Erro ao enviar e-mail:", error);
        } finally {
            await transporter.close();
        }
    }
    
    async function evaluateNewEvent(eventId: number, approve: boolean) {
        const connection = await DataBaseHandler.GetConnection();
    
        try {
            const approvedStatus = approve ? 1 : 0;
            await connection.execute(
                'UPDATE EVENTS SET APPROVED = :approved WHERE ID = :eventId',
                [approvedStatus, eventId]
            );
    
            await connection.commit();
    
            if (!approvedStatus) {
                const eventResult = await connection.execute(
                    'SELECT CPF FROM EVENTS WHERE ID = :eventId',
                    [eventId]
                );

                const rows: number[][] = eventResult.rows as number[][];
    
                // Verifica se `event.rows` não é undefined e possui pelo menos uma linha
                if (eventResult.rows && eventResult.rows.length > 0) {
                    const creator_CPF = eventResult.rows[0];
    
                    const EmailResult = await connection.execute(
                        'SELECT EMAIL FROM ACCOUNTS WHERE TOKKEN = :creator_CPF',
                        [creator_CPF]
                    );
    
                    // Verifica se `result.rows` não é undefined e possui pelo menos uma linha
                    if (EmailResult.rows && EmailResult.rows.length > 0) {
                        const creatorEmail = EmailResult.rows[0] as string;
                        await sendRejectionEmail(creatorEmail);
                    } else {
                        console.warn("Nenhum e-mail encontrado para o criador do evento.");
                    }
                } else {
                    console.warn("Nenhum criador encontrado para o evento.");
                }
            }
    
            return { success: true, message: approve ? 'Evento aprovado' : 'Evento reprovado e e-mail enviado' };
    
        } catch (error) {
            console.error("Erro ao avaliar o evento:", error);
            return { success: false, message: 'Erro ao processar o evento. Tente novamente mais tarde.' };
    
        } finally {
            await connection.close();
        }
    }
    
    export const evaluateEventHandler = async (req: Request, res: Response) => {
        const { eventId, approve } = req.body;
    
        const connection = await DataBaseHandler.GetConnection();

        try {
            const result = await connection.execute('SELECT * FROM EVENTS WHERE ID = :eventId', [eventId]);
            // Verifica se `result.rows` existe e possui pelo menos uma linha
            if (result.rows && result.rows.length > 0) {
                const event = result.rows[0];
    
                const evaluationResult = await evaluateNewEvent(eventId, approve);
    
                if (evaluationResult.success) {
                    res.status(200).send(evaluationResult.message);
                } else {
                    res.status(500).send(evaluationResult.message);
                }
            } else {
                res.status(404).send('Evento não encontrado');
            }
        } catch (error) {
            console.error("Erro ao buscar evento:", error);
            res.status(500).send("Erro interno ao buscar evento.");
        } finally {
            await connection.close();
        }
    };

}