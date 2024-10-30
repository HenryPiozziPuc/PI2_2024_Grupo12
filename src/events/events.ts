import {Request, RequestHandler, Response} from "express";
import OracleDB, { oracleClientVersion } from "oracledb";

/*
CREATE TABLE EVENTS(
    ID INTEGER NOT NULL PRIMARY KEY,
    NAME VARCHAR2(500) NOT NULL,
    CATEGORY VARCHAR2(50) NOT NULL,
    FEE INTEGER NOT NULL,
    START_DATE DATE NOT NULL,
    END_DATE DATE NOT NULL,
    APPROVED BOOLEAN NOT NULL DEFAULT FALSE
);
*/

export namespace EventsHandler {
    
    //Tipo UserAccount
    export type Events = {
        name: string,
        category: string,
        fee:number,
        start_date: Date,
        end_date: Date,
        approved: boolean,
    };

    async function login(email: string, password: string){

        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        // 1 abrir conexao, 2 fazer selecet, 3 fechar conexao, 4 retornar os dados
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString:process.env.ORACLE_CONN_STR
        });

        const accounts = await connection.execute(
            'SELECT * FROM ACCOUNTS WHERE EMAIL = :email AND PASSWORD = :password',
            [email, password]
        );

        await connection.close();

        console.dir(accounts.rows);
    }

    async function deleteEventByID(EventId: number){
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
        let connection;
        try {
            connection = await OracleDB.getConnection();
            const result = await connection.execute(
                `DELETE FROM EVENTS WHERE ID = :id`,
                {id: EventId},
                {autoCommit: true}
            );
            return result.rowsAffected // Faz com que retorne o numero de linhas deletadas
        } catch (error){
            console.error(error);
        } finally {
            if(connection){
                await connection.close();
            }
        }
    }

    export const deleteEvent: RequestHandler = async (req: Request, res: Response) => {
        const eventId = parseInt(req.params.id); // Serve para pegar o ID do evento via URL

        if(!isNaN(eventId)) { // NaN = Not-a-Number, ou seja, retorna true quando o valor eh um numero valido
            try {
                const rowsDeleted = await deleteEventByID(eventId);

                if(rowsDeleted > 0) {
                    res.status(200).json({ message: `Evento com ID ${eventId} deletado com sucesso.` });
                }else {
                    res.status(404).json({ message: `Evento com ID ${eventId} nao encontrado. `});
                }
            } catch (error) {
                res.status(500).json({ message: "Erro interno ao deletar evento", error: error.message });
            }
        } else {
            res.status(400).json({ message: "ID inválido." });
        };
    }
    
    async function createEvent(name:string, category:string, fee: number, start_date: Date, end_date: Date, approved: boolean){

        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
        let connection = await OracleDB.getConnection({
            user: "ADMIN",
            password: "minhasenha",
            connectString:"dados de conexao servidor oracle"
        });

        const accounts = await connection.execute(
            'INSERT INTO EVENTS (name, category, fee, start_date, end_date, approved) VALUES(:name, :category, :fee, :start_date, :end_date, :approved)',
            [name, category, fee, start_date, end_date, approved]
        );
        
        await connection.close();

        console.dir(accounts.rows);
    }

    export const addNewEvent: RequestHandler = (req: Request, res: Response) => {
        const pName = req.get('name');
        const pCategory = req.get('category');
        const pFee = req.get('Fee');
        const pStartDate = req.get('startDate');
        const pEndDate = req.get('endDate');
        const pApproved = req.get('approved');

        if (pName && pCategory && pFee && pStartDate && pEndDate && pApproved) {
            const Events: Events = {
                name: pName,
                category: pCategory,
                fee: Number(pFee),
                start_date: new Date(pStartDate),
                end_date: new Date(pEndDate),
                approved: Boolean (pApproved)
            }

            const ID = createEvent(Events.name, Events.category, Events.fee, Events.start_date, Events.end_date, Events.approved);
            
            res.statusCode = 200; 
            res.send(`Nova conta adicionada. Código: ${ID}`);

        } else {
            res.statusCode = 400;
            res.send("Parâmetros inválidos ou faltantes.");
        }

    };
}