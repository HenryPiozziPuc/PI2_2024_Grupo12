import {Request, RequestHandler, Response} from "express";
import { DataBaseHandler } from "../DB/connection";
import nodemailer from 'nodemailer';
require('dotenv').config();

export namespace EventsManager {

    // Type para representar um evento
    export type Event = {
        name: string,
        description: string, // Adicionada esta linha
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
                'INSERT INTO EVENTS (ID, NAME, DESCRICAO, CATEGORY, QUOTA, START_DATE, END_DATE, APPROVED, STATUS_EVENT, CPF) VALUES(SEQ_EVENTS.NEXTVAL, :name, :description, :category, :quota, :start_date, :end_date, :approved, :status_event, :creator_CPF)',
                [event.name, event.description, event.category, event.quota, event.start_date, event.end_date, event.approved, event.status_event, event.creator_CPF]
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
        const pDescription = req.get('description');
        const pCategory = req.get('category');
        const pQuota = parseInt(req.get('quota') || '');
        const pStart_date = req.get('start_date');
        const pEnd_date = req.get('end_date');
        const pCreator_CPF = parseInt(req.get('creator_CPF') || '');

        if (pName && pDescription && pCategory && !isNaN(pQuota) && pStart_date && pEnd_date && !isNaN(pCreator_CPF)) {
            // Verifica se a data de início é válida (não está no passado)
            if (!isDateInFuture(pStart_date)) {
                res.status(400).send("A data de início do evento não pode estar no passado.");
                return;
            }

            const newEvent: Event = {
                name: pName,
                description: pDescription, // Adicionado aqui
                category: pCategory,
                quota: pQuota,
                start_date: new Date(pStart_date),
                end_date: new Date(pEnd_date),
                approved: 0,
                status_event: 1,
                creator_CPF: pCreator_CPF
            };

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
    async function getFilteredEvents(filter: string, pCPF?: number) {
        const connection = await DataBaseHandler.GetConnection();
    
        try {
            let query = '';  // A variável 'query' será construída dentro do switch
            let parameters: Record<string, any> = {};
        
            switch (filter) {
                case 'finalizando':
                    query = `SELECT E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF, COUNT(B.ID) AS BET_COUNT
                              FROM EVENTS E
                              LEFT JOIN BETS B ON E.ID = B.ID_EVENTS
                              WHERE E.END_DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + 2 AND E.APPROVED = 1 AND E.STATUS_EVENT = 1
                              GROUP BY E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF
                              ORDER BY E.START_DATE ASC`;
                    break;
        
                case 'mais_apostas':
                    query = `SELECT E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF, COUNT(B.ID) AS BET_COUNT
                              FROM EVENTS E
                              LEFT JOIN BETS B ON E.ID = B.ID_EVENTS
                              WHERE E.APPROVED = 1 AND E.STATUS_EVENT = 1
                              GROUP BY E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF
                              HAVING COUNT(B.ID) > 0
                              ORDER BY BET_COUNT DESC`;
                    break;
        
                case 'agrupados_por_categoria':
                    query = `SELECT E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF, COUNT(B.ID) AS BET_COUNT
                              FROM EVENTS E
                              LEFT JOIN BETS B ON E.ID = B.ID_EVENTS
                              WHERE E.APPROVED = 1 AND E.STATUS_EVENT = 1
                              GROUP BY E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF
                              ORDER BY E.CATEGORY ASC, E.NAME ASC`;
                    break;
        
                case 'all_events':
                    query = `SELECT E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF, COUNT(B.ID) AS BET_COUNT
                              FROM EVENTS E
                              LEFT JOIN BETS B ON E.ID = B.ID_EVENTS
                              WHERE E.STATUS_EVENT = 1
                              GROUP BY E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF
                              ORDER BY E.APPROVED DESC`;
                    break;
        
                case 'event_created_by_user':
                    if (pCPF) {
                        query = `SELECT E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF, COUNT(B.ID) AS BET_COUNT
                                  FROM EVENTS E
                                  LEFT JOIN BETS B ON E.ID = B.ID_EVENTS
                                  WHERE E.CPF = :pCPF AND E.STATUS_EVENT = 1
                                  GROUP BY E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF
                                  ORDER BY E.APPROVED DESC`;
                        parameters = { pCPF };
                    }
                    break;
        
                default:
                    throw new Error('Filtro inválido.');
            }
        
            const result = await connection.execute<EventRow[]>(query, parameters);
        
            const events = result.rows?.map(row => ({
                id: row[0],
                name: row[1],
                description: row[2],
                category: row[3],
                quota: row[4],
                start_date: row[5],
                end_date: row[6],
                approved: row[7],
                status_event: row[8],
                creator_CPF: row[9],
                bet_count: filter === 'event_created_by_user' || filter === 'mais_apostas' || filter === 'all_events' || filter === 'agrupados_por_categoria' || filter === 'finalizando' ? row[10] : null
            })) || [];
        
            return { success: true, events };
        } catch (error) {
            console.error("Erro na consulta:", error);
            return { success: false, message: 'Erro ao buscar eventos.' };
        } finally {
            await connection.close();
        }
        
    }
    
    /* getEventsHandler Funcionando */
    export const getEventsHandler: RequestHandler = async (req: Request, res: Response) => {
        const filter = req.get('filter');  // Parâmetro "filter" do header
        const cpf = req.get('cpf');
        
        let pCPF: number | undefined;
        if (typeof cpf === 'string') {
            pCPF = parseInt(cpf, 10);
        } else {
            pCPF = undefined;
        }

        try {
            if (filter) {
                const result = await getFilteredEvents(filter, pCPF);
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

    // Função para verificar se há apostas associadas ao evento
    async function hasBets(eventId: number): Promise<boolean> {
        const connection = await DataBaseHandler.GetConnection();

        try {
            const result = await connection.execute(
                'SELECT COUNT(*) AS COUNT FROM BETS WHERE ID_EVENTS = :eventId',
                { eventId }
            );

            const rows: any[][] = result.rows as any[][];

            if (rows[0][0] > 0) {
                return true;
            } else {
                return false;
            }

        } catch (error) {
            console.error(error);
            throw new Error('Erro ao verificar apostas do evento.');
        } finally {
            await connection.close();
        }
    }

    // Função para atualizar o status do evento
    async function updateEventStatus(eventId: number, newStatus: number) {
        const connection = await DataBaseHandler.GetConnection();

        try {

            // Verificando se o evento existe
            const eventResult = await connection.execute(
                'SELECT ID FROM EVENTS WHERE ID = :eventId',
                [eventId]
            );

            if (!eventResult.rows || eventResult.rows.length === 0) {
                return { success: false, message: 'Evento não encontrado.' };
            }

            const result = await connection.execute(
                'UPDATE EVENTS SET STATUS_EVENT = :newStatus WHERE ID = :eventId',
                { newStatus, eventId }
            );

            await connection.commit();

            if (result.rowsAffected && result.rowsAffected > 0) {
                return { success: true, message: 'Evento excluido com sucesso.' };
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

    // Handler para a rota
    export const updateEventStatusHandler: RequestHandler = async (req: Request, res: Response) => {
        const eventId = parseInt(req.get('id') || '', 10);

        if (!eventId) {
            res.status(400).json({ success: false, message: 'ID do evento é obrigatório!' });
            return;
        }

        try {
            // Verifica se o evento tem apostas
            const hasActiveBets = await hasBets(eventId);

            if (hasActiveBets) {
                res.status(400).json({ success: false, message: 'Não é possível excluir um evento com apostas associadas.' });
                return;
            }

            // Atualiza o status do evento
            const result = await updateEventStatus(eventId, 0);

            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erro interno ao processar a requisição.' });
        }
    };



    async function sendRejectionEmail(to: string, reason: string) {
        const transporter = nodemailer.createTransport({
            host: 'mail.woodlaw.com.br',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    
        const mailOptions = {
            from: `"PUC BET - Eventos" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: 'Notificação: Evento Reprovado',
            html: `
            
            <div style=" font-family: Arial, sans-serif; line-height: 1.6; color: #ffffff; padding: 46px 28px 53px; border-radius: 1rem; background: linear-gradient(223.7deg, #3b454e -0.11%, #131b24 50.01%); text-align: center;">
                <h2 style="color: #fff; text-align: center;">Seu evento foi reprovado</h2>
                <p>Prezado(a),</p>
                <p>Infelizmente, o seu evento não foi aprovado. Lamentamos por qualquer inconveniente.</p>
                <p><strong>Motivo:</strong> ${reason}</p>
                <p>Para mais informações ou esclarecimentos, entre em contato com a nossa equipe.</p>
                <div style="margin-top: 20px; text-align: center;">
                    <a href="mailto:${process.env.EMAIL_USER}" style=" display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: bold; color: white; text-decoration: none; border-radius: 100px; background: linear-gradient(90deg, rgba(54, 28, 145, 1) 40%, rgba(93, 50, 217, 1) 60%, rgba(145, 112, 240, 1) 100%); border: 1px solid rgb(54, 28, 145); "> Entrar em contato </a>
                </div>
                <p style="margin-top: 20px;">Atenciosamente,<br><strong>Equipe PUC BET Eventos</strong></p>
            </div>`
        };
    
        try {
            await transporter.sendMail(mailOptions);
            console.log(`E-mail de reprovação enviado para: ${to}`);
        } catch (error) {
            console.error("Erro ao enviar e-mail:", error);
        }
    }
    

    // Função para verificar a role do usuário
    async function checkUserRole(cpf: number): Promise<boolean> {
        const connection = await DataBaseHandler.GetConnection();

        try {
            const result = await connection.execute(
                'SELECT ROLE FROM ACCOUNTS WHERE CPF = :cpf',
                [cpf]
            );

            const resultRows: any[][] = result.rows as any[][];
            
            // Verifica se encontrou o CPF e se a role é igual a 1
            if (result.rows && result.rows.length > 0) {
                const role = resultRows[0][0];
                return role === 1;
            }

            return false;
        } catch (error) {
            console.error(error);
            return false;
        } finally {
            await connection.close();
        }
    }

    /* Função para avaliar um evento */
    async function evaluateNewEvent(eventId: number, approved: string, reason: string) {
        const connection = await DataBaseHandler.GetConnection();
        const aApprove = Number(approved);

        try {
            
            // Verificando se o evento existe
            const eventResult = await connection.execute(
                'SELECT ID FROM EVENTS WHERE ID = :eventId',
                [eventId]
            );

            if (!eventResult.rows || eventResult.rows.length === 0) {
                return { success: false, message: 'Evento não encontrado.' };
            }

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

                if (eventResult.rows && eventResult.rows.length > 0) {
                    const creator_CPF = rows[0][0];
                    const emailResult = await connection.execute(
                        'SELECT EMAIL FROM ACCOUNTS WHERE CPF = :creator_CPF',
                        [creator_CPF]
                    );

                    const emailResultRows: string[][] = emailResult.rows as string[][];

                    if (emailResult.rows && emailResult.rows.length > 0) {
                        const creatorEmail = emailResultRows[0][0];
                        await sendRejectionEmail(creatorEmail, reason);
                    } else {
                        return { success: false, message: 'Nenhum e-mail encontrado para o criador do evento.' };
                    }
                } else {
                    return { success: false, message: 'Nenhum criador encontrado para o evento.' };
                }
                return { success: false, message: 'Evento reprovado e e-mail enviado para o criador.' };
            }

            return { success: true, message: 'Evento aprovado' };

        } catch (error) {
            console.error("Erro ao avaliar o evento:", error);
            return { success: false, message: 'Erro ao processar o evento. Tente novamente mais tarde.' };

        } finally {
            await connection.close();
        }
    }

    /* Handler atualizado */
    export const evaluateEventHandler: RequestHandler = async (req: Request, res: Response) => {
        const cpf = Number(req.get('cpf')); // CPF enviado no cabeçalho da requisição
        const eID = Number(req.get('eventID'));
        const pApproved = req.get('approved');
        const pReason = req.get('reason');

        if (pApproved !== '0' && pApproved !== '1') {
            res.status(400).json({ success: false, message: "Parâmetros inválidos. Digite 1 ou 0 para aprovar ou rejeitar o evento." });
        }

        if (!eID || !pApproved) {
            res.status(400).json({ success: false, message: "Parâmetros inválidos ou faltantes." });
        }

        const hasPermission = await checkUserRole(cpf);

        if (!hasPermission) {
            res.status(403).json({ success: false, message: "Acesso negado. Usuário não possui permissão para realizar esta ação." });
        }
        
        let evaluationResult;

        if (pApproved === undefined || pReason === undefined) {
            res.status(400).json({ success: false, message: "Parâmetros inválidos. O motivo e a aprovação são obrigatórios." });
          } else {
            evaluationResult = await evaluateNewEvent(eID, pApproved, pReason);
          }

          if (evaluationResult && evaluationResult.success) {
            res.status(200).json(evaluationResult);
          } else {
            res.status(500).json(evaluationResult);
          }
    };

}