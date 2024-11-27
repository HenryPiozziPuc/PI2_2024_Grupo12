import {Request, RequestHandler, Response} from "express";
import { DataBaseHandler } from "../DB/connection";
import nodemailer from 'nodemailer';
require('dotenv').config();

export namespace EventsManager {

    // Type para representar um evento
    export type Event = {
        name: string,
        category: string,
        quota: number,
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
                'INSERT INTO EVENTS (ID, NAME, CATEGORY, QUOTA, START_DATE, END_DATE, APPROVED, STATUS_EVENT, CPF) VALUES(SEQ_EVENTS.NEXTVAL, :name,:category,:quota,:start_date,:end_date,:approved,:status_event,:creator_CPF)',
                [event.name, event.category, event.quota, event.start_date, event.end_date, event.approved, event.status_event, event.creator_CPF]
            );
            await connection.commit();
            return { success: true, message: 'Evento criado com sucesso. Em Breve um moderador irá aprovar seu evento!' };
        } catch (error) {
            console.error('Erro ao criar evento:', error);
            return { success: false, message: 'Erro ao criar evento. Tente novamente mais tarde.' }
        } finally {
            await connection.close();
        }
    }

    //função para verificar se evento está no futuro
    const isDateInFuture = (date: string): boolean => {
        const givenDate = new Date(date);
        const today = new Date();
    
        // Remove a parte de horas/minutos/segundos para comparar apenas as datas
        today.setHours(0, 0, 0, 0);
        givenDate.setHours(0, 0, 0, 0);
    
        return givenDate >= today;
    };

    /* AddNewEventHandler Funcionando */
    export const addNewEventHandler: RequestHandler = async (req: Request, res: Response) =>{
        const pName = req.get('name');
        const pCategory = req.get('category');
        const pQuota = parseInt(req.get('quota') || '');
        const pStart_date = req.get('start_date');
        const pEnd_date = req.get('end_date');
        const pCreator_CPF = parseInt(req.get('creator_CPF') || '');

        if(pName && pCategory && !isNaN(pQuota) && pStart_date && pEnd_date && !isNaN(pCreator_CPF)){

             // Verifica se a data de início é válida (não está no passado)
            if (!isDateInFuture(pStart_date)) {
                res.status(400).send("A data de início do evento não pode estar no passado.");
                return;
            }
            const newEvent: Event = {
                name: pName,
                category: pCategory,
                quota: pQuota,
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
                case 'finalizando': // Categorizar eventos em andamento, próximos de vencer
                    conditions.push(`end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 2 AND APPROVED = 1`);
                    break;

                case 'mais_apostas': // Eventos com mais apostas
                    query = `
                        SELECT E.*, COUNT(B.ID) AS BET_COUNT
                        FROM EVENTS E
                        LEFT JOIN BETS B ON E.ID = B.ID_EVENTS
                        WHERE E.APPROVED = 1
                        GROUP BY E.ID, E.NAME, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF
                        HAVING COUNT(B.ID) > 0
                        ORDER BY BET_COUNT DESC `;
                    break;

                case 'agrupados_por_categoria': // Eventos completos agrupados por categoria
                    query = `SELECT E.*, COUNT(B.ID) AS BET_COUNT
                        FROM EVENTS E
                        LEFT JOIN BETS B ON E.ID = B.ID_EVENTS
                        WHERE E.APPROVED = 1
                        GROUP BY E.ID, E.NAME, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF
                        ORDER BY E.CATEGORY ASC, E.NAME ASC`;
                    break;
                
                case 'all_events': // Todos os eventos aprovados
                    query = `SELECT E.*, COUNT(B.ID) AS BET_COUNT
                    FROM EVENTS E
                    LEFT JOIN BETS B ON E.ID = B.ID_EVENTS
                    GROUP BY E.ID, E.NAME, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF
                    ORDER BY E.APPROVED DESC`;       
                    break;

                default:
                    throw new Error('Filtro inválido.');
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            const result = await connection.execute<EventRow[]>(query, parameters);

            const events = result.rows?.map(row => ({
                id: row[0],
                name: row[1],
                category: row[2],
                quota: row[3],
                start_date: row[4],
                end_date: row[5],
                approved: row[6],
                status_event: row[7],
                creator_CPF: row[8],
                bet_count: filter === 'mais_apostas' || filter === 'all_events' || filter === 'agrupados_por_categoria' ? row[9] : null // Contagem de apostas
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
        const filter = req.get('filter');  // Parâmetro "filter" do header
        try {
            if (filter) {
                const result = await getFilteredEvents(filter);
                if (result.success) {
                    res.status(200).json(result.events);
                } else {
                    res.status(400).send(result.message);
                }
            } else {
                res.status(400).send("Filtro não especificado.");
            }
        } catch (error) {
            res.status(400).send("Erro ao buscar eventos.");
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

    /* sendRejectionEmail Funcionando */
    async function sendRejectionEmail(to: string) {
        const transporter = nodemailer.createTransport({
            host: 'mail.woodlaw.com.br', // Substitua pelo seu domínio
            port: 465, // Use 465 para SSL ou 587 para TLS
            secure: true, // Defina como true para 465, e false para 587
            auth: {
                user: process.env.EMAIL_USER, // Seu e-mail completo na HostGator
                pass: process.env.EMAIL_PASSWORD // Sua senha de e-mail
            }
        });
    
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: 'Evento Reprovado',
            text: `Infelizmente, o seu evento foi reprovado. Entre em contato para mais informações.`
        };
    
        try {
            await transporter.sendMail(mailOptions);
            console.log(`E-mail de reprovação enviado para: ${to}`);
        } catch (error) {
            console.error("Erro ao enviar e-mail:", error);
        }
    }
    
    /* evaluateNewEvent Funcionando */
    async function evaluateNewEvent(eventId: number, approved: string) {
        const connection = await DataBaseHandler.GetConnection();

        const aApprove = Number(approved);
    
        try {
        
            await connection.execute(
                'UPDATE EVENTS SET APPROVED = :aApprove WHERE ID = :eventId',
                [aApprove, eventId]
            );
            
            await connection.commit();
    
            if (aApprove === 0) {
                const eventResult = await connection.execute(
                    'SELECT CPF FROM EVENTS WHERE ID = :eventId',
                    [eventId]
                );
                
                const rows: number[][] = eventResult.rows as number[][];
                
                // Verifica se rows não é undefined e possui pelo menos uma linha
                if (eventResult.rows && eventResult.rows.length > 0) {
                    const creator_CPF = (eventResult.rows as number[][])[0][0];
                
                    const EmailResult = await connection.execute(
                        'SELECT EMAIL FROM ACCOUNTS WHERE CPF = :creator_CPF',
                        [creator_CPF]
                    );

                    // Verifica se `result.rows` não é undefined e possui pelo menos uma linha
                    if (EmailResult.rows && EmailResult.rows.length > 0) {
                        const creatorEmail = EmailResult.rows[0] as string;
                        await sendRejectionEmail(creatorEmail);
                    } else {
                        return {sucess: false, message: 'Nenhum e-mail encontrado para o criador do evento.'};
                    }
                } else {
                    return {sucess: false, message: 'Nenhum criador encontrado para o evento.'};
                }
                return { success: false, message: 'Evento reprovado e e-mail enviado para o criador.' };
            }
    
            return { success: true, message: 'Evento aprovado'};
    
        } catch (error) {
            console.error("Erro ao avaliar o evento:", error);
            return { success: false, message: 'Erro ao processar o evento. Tente novamente mais tarde.' };
    
        } finally {
            await connection.close();
        }
    }
    
    /* evaluateEventHandler Funcionando */
    export const evaluateEventHandler = async (req: Request, res: Response) => {
        const eID = Number(req.get('eventID'));
        const pApproved = req.get('approved');

        if (pApproved !== '0' && pApproved !== '1') {
            res.status(400).send("Parâmetros inválidos. Digite 1 ou 0 para aprovar ou rejeitar o evento.");
        }

        if (eID && pApproved) {
            const evaluationResult = await evaluateNewEvent(eID, pApproved);

            if (evaluationResult.success) {
                res.status(200).send(evaluationResult.message);
            } else {
                res.status(500).send(evaluationResult.message);
            }
        } else {
            res.status(400).send("Parâmetros inválidos ou faltantes.");
        }
    };
}