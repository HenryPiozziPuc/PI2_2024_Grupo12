import { Request, RequestHandler, Response } from "express";
import { DataBaseHandler } from "../DB/connection";
import { AccountsManager } from "../accounts/accounts";
import { resourceLimits } from "worker_threads";

/* Namespace contendo tudo sobre apostas */
export namespace BetsManager {
    type BetParams = {
        userCPF: number; 
        eventId: number;
        quotaAmount: number; // Quantidade de cotas que o usuário deseja comprar
        choice: number; // 1 para "Sim", 0 para "Não"
    };

    type FinishEventParams = {
        eventId: number; // ID do evento a ser encerrado
        EventResult: number; // Resultado final do evento: 1 para "Sim", 0 para "Não"
    };

    type EventSearchParams = {
        keyword: string; // Palavra-chave para buscar eventos
    };

    /* Função para criar uma aposta em um evento */
    async function createBet(bet: BetParams) {
        const connection = await DataBaseHandler.GetConnection();
    
        try {
            // Verifica o saldo do usuário na carteira
            const balanceResult = await connection.execute(
                'SELECT BALANCE FROM WALLET WHERE CPF = :cpf',
                [bet.userCPF]
            );
            const rows: any[][] = balanceResult.rows as any[][];
            if (rows.length === 0) return { success: false, message: "Usuário não encontrado." };
    
            const balance = Number(rows[0][0]);
    
            // Busca o evento e verifica se o evento está aprovado e dentro do período permitido
            const eventResult = await connection.execute(
                'SELECT APPROVED, START_DATE, END_DATE, QUOTA FROM EVENTS WHERE ID = :eventId',
                [bet.eventId]
            );
            const eventRows: any[][] = eventResult.rows as any[][];
            if (eventRows.length === 0) return { success: false, message: "Evento não encontrado." };
    
            const [approved, startDate, endDate, quota] = eventRows[0];
    
            // Verifica se o evento foi aprovado
            if (approved === 0) {
                return { success: false, message: "Evento não aprovado para apostas." };
            }
    
            // Verifica se a data atual está dentro do período do evento
            const currentDate = new Date();
            if (currentDate < new Date(startDate) || currentDate > new Date(endDate)) {
                return { success: false, message: "Não é possível apostar fora do período do evento." };
            }
    
            // Calcula o valor total da aposta com base nas cotas
            const totalBetAmount = quota * bet.quotaAmount;
    
            // Verifica se o usuário tem saldo suficiente para a aposta
            if (balance < totalBetAmount) {
                return { success: false, message: "Saldo insuficiente." };
            }
    
            // Deduz o saldo da carteira do usuário
            const newBalance = balance - totalBetAmount;
            await connection.execute(
                'UPDATE WALLET SET BALANCE = :newBalance WHERE CPF = :cpf',
                [newBalance, bet.userCPF]
            );
    
            // Registra a aposta na tabela BETS
            await connection.execute(
                'INSERT INTO BETS (ID, BET_VALUE, CHOICE, CPF, ID_EVENTS) VALUES (SEQ_BETS.NEXTVAL, :totalBetAmount, :choice, :cpf, :eventId)',
                [totalBetAmount, bet.choice, bet.userCPF, bet.eventId]
            );
    
            await connection.commit();
            return { success: true, message: "Aposta registrada com sucesso." };
        } catch (error) {
            await connection.rollback();
            return { success: false, message: (error as Error).message };
        } finally {
            await connection.close();
        }
    }
    

    /* Handler para processar apostas: Verifica autenticação, valida os dados e registra a aposta */
    export const BetOnEventHandler: RequestHandler = async (req: Request, res: Response) => {
        const userCPF = parseInt(req.get('cpf') || '', 10);
        const eventId = parseInt(req.get('eventId') || '', 10);
        const quotaAmount = parseInt(req.get('quotaAmount') || '0', 10);
        let choice = parseInt(req.get('choice') || '', 10);

        if (!userCPF || !eventId || choice === null || choice === undefined || quotaAmount <= 0) {
            res.status(400).json({ message: "Todos os campos (cpf, eventId, choice, quotaAmount) são obrigatórios e válidos." });
            return;
        }

    
        const betParams: BetParams = { userCPF, eventId, quotaAmount, choice };
        const result = await createBet(betParams);
    
        res.status(result.success ? 200 : 400).json(result);
    };
    

    /* Função para encerrar um evento e distribuir os ganhos */
    async function finishEvent(params: FinishEventParams) {
        const connection = await DataBaseHandler.GetConnection();
        try {
            const { eventId, EventResult } = params;

            // Busca todas as apostas relacionadas ao evento
            const betsResult = await connection.execute(
                'SELECT CPF, BET_VALUE, CHOICE FROM BETS WHERE ID_EVENTS = :eventId',
                [eventId]
            );

            const bets = betsResult.rows as any[][];
            if (bets.length === 0) {
                return "Nenhuma aposta encontrada para este evento."; // Nenhuma aposta registrada
            }

            // Busca o valor da cota do evento
            const eventResult = await connection.execute(
                'SELECT QUOTA FROM EVENTS WHERE ID = :eventId',
                [eventId]
            );
            
            const eventRows: any[][] = eventResult.rows as any[][];
            if (eventRows.length === 0) {
                return "Evento não encontrado."; // Evento não existe
            }

            const quota = Number(eventRows[0][0]);
            if (isNaN(quota) || quota <= 0) {
                return "Quota do evento inválida."; // Verifica se a cota do evento é válida
            }

            // Calcula os vencedores e distribui os fundos proporcionalmente
            const winners = bets.filter(bet => bet[2] === EventResult); // Filtra as apostas vencedoras (Sim ou Não)
            const totalBetAmount = bets.reduce((sum, bet) => sum + Number(bet[1]), 0); // Soma total das apostas
            const totalWinnersAmount = winners.reduce((sum, winner) => sum + Number(winner[1]), 0); // Soma das apostas vencedoras

            if (winners.length === 0) {
                return "Não houve vencedores, pois nenhuma aposta corresponde ao resultado."; // Caso não haja vencedores
            }

            // Distribui os prêmios entre os vencedores proporcionalmente
            for (const winner of winners) {
                const userCPF = winner[0];
                const userBetAmount = Number(winner[1]); // Aposta feita pelo vencedor
                const reward = (userBetAmount / totalWinnersAmount) * totalBetAmount; // Proporção do prêmio

                // Atualiza o saldo dos vencedores
                await connection.execute(
                    'UPDATE WALLET SET BALANCE = BALANCE + :reward WHERE CPF = :cpf',
                    [reward, userCPF]
                );
            }

            // Se a operação foi bem-sucedida, faz o commit
            await connection.commit();
            return "Evento encerrado e prêmios distribuídos com sucesso.";
        } catch (error) {
            // Caso ocorra algum erro, faz o rollback
            await connection.rollback();
            return (error as Error).message;
        } finally {
            // Fecha a conexão
            await connection.close();
        }
    }

    /* Handler para encerrar evento: Apenas moderadores podem encerrar eventos. */
    export const FinishEventHandler: RequestHandler = async (req: Request, res: Response) => {
        const eventId = parseInt(req.get('eventId') || '', 10);
        const EventResult = parseInt(req.get('EventResult') || '', 10); // 1 ou 0 (Sim ou Não)

        if (!eventId || (EventResult !== 0 && EventResult !== 1)) {
            res.status(400).send("ID do evento e resultado (0 ou 1) são obrigatórios.");
            return;
        }

        const result = await finishEvent({ eventId, EventResult });
        if (result === "Evento encerrado e prêmios distribuídos com sucesso.") {
            res.status(200).send(result);
        } else {
            res.status(400).send(result);
        }
    };

    async function searchEvents(params: EventSearchParams) {
        const connection = await DataBaseHandler.GetConnection();
        try {
            const { keyword } = params;
    
            // Alterando a consulta para aceitar dois parâmetros de bind
            const eventsResult = await connection.execute(
                `SELECT E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF, 
                        COUNT(B.ID) AS BET_COUNT
                FROM EVENTS E
                LEFT JOIN BETS B ON E.ID = B.ID_EVENTS
                WHERE LOWER(E.NAME) LIKE :keyword OR LOWER(E.CATEGORY) LIKE :keyword
                GROUP BY E.ID, E.NAME, E.DESCRICAO, E.CATEGORY, E.QUOTA, E.START_DATE, E.END_DATE, E.APPROVED, E.STATUS_EVENT, E.CPF
                ORDER BY E.APPROVED DESC`, 
                [`%${keyword.toLowerCase()}%`, `%${keyword.toLowerCase()}%`]  // Passando dois parâmetros
            );

            const events = eventsResult.rows as any[][];
    
            if (events.length === 0) {
                return "Nenhum evento encontrado."; // Caso não haja eventos, retorna uma mensagem
            }
    
            return events.map(event => ({
                id: event[0],                  // ID do evento
                name: event[1],
                description: event[2],                // Nome do evento
                category: event[3],            // Categoria
                quota: event[4],               // Quota
                start_date: event[5],          // Data de início
                end_date: event[6],            // Data de término
                approved: event[7],            // Status de aprovação
                status_event: event[8],        // Status do evento
                cpf: event[9],                 // CPF
                bet_count: event[10] ?? 0       // Contagem de apostas (com valor padrão 0 caso não haja apostas)
            }));
        } catch (error) {
            console.error("Erro ao buscar eventos:", error);
            throw error;
        } finally {
            await connection.close();  
        }
    }
    
    

    /* Handler para buscar eventos w/ Keyword */
    export const SearchEventHandler: RequestHandler = async (req: Request, res: Response) => {
        const keyword = req.get('keyword');
    
        if (!keyword) {
            res.status(400).send("Palavra-chave é obrigatória."); // Envia o erro 400 caso não tenha palavra-chave
            return;  // Finaliza a execução após enviar a resposta
        }
    
        try {
            const result = await searchEvents({ keyword });
            res.status(200).send(result);  // Envia a resposta com os eventos encontrados
        } catch (error) {
            const errorAsError = error as Error;
            console.error("Erro ao buscar eventos:", errorAsError);
            res.status(500).json({
                error: "Erro ao buscar eventos",
                message: errorAsError.message || errorAsError.toString()  // Mensagem do erro
            });
        }
    };
    


   /* Função para obter apostas */
    async function GetBets(cpf: number) {
        const connection = await DataBaseHandler.GetConnection();

        try {
            const betsResult = await connection.execute(
                'SELECT E.NAME AS EVENT_NAME, B.BET_VALUE, B.CHOICE ' +
                'FROM BETS B ' +
                'JOIN EVENTS E ON B.ID_EVENTS = E.ID ' +
                'WHERE B.CPF = :cpf',
                { cpf } // Aqui passamos um objeto com a chave "cpf"
            );
            

            const result = betsResult.rows as any[][];

            if (result.length === 0) {
                return { success: false, message: "Nenhuma aposta encontrada." }; // Retorna um objeto com sucesso e mensagem
            }

            // Retorna as apostas em um formato mais organizado
            return { success: true, data: result.map(event => ({
                name: event[0],
                bet_value: event[1],
                choice: event[2],
            })) };
        } catch (error) {
            // Captura o erro e o retorna de maneira padronizada
            console.error("Erro ao obter apostas:", (error as Error).message);
            return { success: false, message: (error as Error).message };
        } finally {
            await connection.close(); // Garante que a conexão será fechada
        }
    }

    export const GetBetsHandler: RequestHandler = async (req: Request, res: Response) => {
        const pCPF = parseInt(req.get('cpf') || '', 10);

        if (isNaN(pCPF) || pCPF <= 0) {
            // Verifica se o CPF é válido
            res.status(400).json({ success: false, message: "CPF é obrigatório e deve ser um número válido." });
            return;
        }

        try {
            const result = await GetBets(pCPF);

            if (!result.success) {
                // Se não houver sucesso na obtenção das apostas, retorna a mensagem
                res.status(404).json(result);
            } else {
                // Caso contrário, envia as apostas encontradas
                res.status(200).json(result);
            }
        } catch (error) {
            // Em caso de erro no processamento da requisição
            const errorAsError = error as Error;
            console.error("Erro ao buscar as apostas:", errorAsError);
            res.status(500).json({
                success: false,
                error: "Erro ao buscar as apostas",
                message: errorAsError.message || errorAsError.toString()
            });
        }
    };



}