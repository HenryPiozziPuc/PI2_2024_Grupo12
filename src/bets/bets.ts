import { Request, RequestHandler, Response } from "express";
import { DataBaseHandler } from "../DB/connection";
import { AuthenticateTokenManager } from "../accounts/authenticateToken";

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
            if (rows.length === 0) return "Usuário não encontrado."; // CPF não encontrado

            const balance = Number(rows[0][0]);

            // Busca o evento e verifica se o evento está aprovado e dentro do período permitido
            const eventResult = await connection.execute(
                'SELECT APPROVED, START_DATE, END_DATE, QUOTA FROM EVENTS WHERE ID = :eventId',
                [bet.eventId]
            );
            const eventRows: any[][] = eventResult.rows as any[][];
            if (eventRows.length === 0) return "Evento não encontrado."; // Evento não existe

            const [approved, startDate, endDate, quota] = eventRows[0];

            // Verifica se o evento foi aprovado
            if (approved === 0) {
                return "Evento não aprovado para apostas."; // Evento não aprovado
            }

            // Verifica se a data atual está dentro do período do evento
            const currentDate = new Date();
            if (currentDate < new Date(startDate) || currentDate > new Date(endDate)) {
                return "Não é possível apostar fora do período do evento."; // Fora do período permitido
            }

            // Calcula o valor total da aposta com base nas cotas
            const totalBetAmount = quota * bet.quotaAmount;

            // Verifica se o usuário tem saldo suficiente para a aposta
            if (balance < totalBetAmount) {
                return "Saldo insuficiente."; // Verifica se o saldo é suficiente para a aposta
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
            return "Aposta registrada com sucesso.";
        } catch (error) {
            await connection.rollback();
            return (error as Error).message;
        } finally {
            await connection.close();
        }
    }

    /* Handler para processar apostas: Verifica autenticação, valida os dados e registra a aposta */
    export const BetOnEventHandler: RequestHandler = async (req: Request, res: Response) => {
        if (await AuthenticateTokenManager.AuthenticateTokenHandler(req, res)) return;

        const userCPF = parseInt(req.get('cpf') || '', 10);
        const eventId = parseInt(req.get('eventId') || '', 10);
        const quotaAmount = parseInt(req.get('quotaAmount') || '0', 10); // Quantidade de cotas
        const choice = parseInt(req.get('choice') || '', 10); // 1 ou 0 (Sim ou Não)

        if (!userCPF || !eventId || !choice || quotaAmount <= 0) {
            res.status(400).send("Todos os campos (cpf, eventId, choice, quotaAmount) são obrigatórios e válidos.");
            return;
        }

        const betParams: BetParams = { userCPF, eventId, quotaAmount, choice };
        const result = await createBet(betParams);
        if (result === "Aposta registrada com sucesso.") {
            res.status(200).send(result);
        } else {
            res.status(400).send(result);
        }
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


    /* Função para buscar eventos com base em uma palavra-chave */
    async function searchEvents(params: EventSearchParams) {
        const connection = await DataBaseHandler.GetConnection();
        try {
            const { keyword } = params;

            // Busca eventos que contêm a palavra-chave no nome
            const eventsResult = await connection.execute(
                'SELECT ID, NAME, CATEGORY FROM EVENTS WHERE LOWER(NAME) LIKE :keyword',
                [`%${keyword.toLowerCase()}%`]
            );

            const events = eventsResult.rows as any[][];
            if (events.length === 0) return "Nenhum evento encontrado.";

            return events.map(event => ({
                id: event[0],
                name: event[1],
                category: event[2]
            }));
        } catch (error) {
            return (error as Error).message;
        } finally {
            await connection.close();
        }
    }

    /* Handler para buscar eventos w/ Keyword */
    export const SearchEventHandler: RequestHandler = async (req: Request, res: Response) => {
        const keyword = req.get('keyword');
        if (!keyword) {
            res.status(400).send("Palavra-chave é obrigatória.");
            return;
        }

        const result = await searchEvents({ keyword });
        res.status(200).send(result);
    };
}
