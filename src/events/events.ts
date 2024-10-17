import {Request, RequestHandler, Response} from "express";
import OracleDB, { oracleClientVersion } from "oracledb";

/*
export class EventService{
    async searchEvents (busca: string = '', categoria: string = '', ordenar: string = 'Aposta finalizada'): Promise<any>{
        try{

            let query = `SELECT * FROM events WHERE status = 'approved '`;

            if (busca){
                query += `AND (TITLE ILIKE '%${busca}%' OR DESCRIPTION ILIKE'%${busca}%) `;
            }
            if(categoria) {
                query += `AND categoria = '%${categoria}' `;
            }

            if(ordenar == 'Aposta finalizada'){
                query += `ORDER BY aposta_finalizada ASC`;
            }else if (ordenar === 'mostBet'){
                query += `ORDER BY total_apostas DESC`
            }

            const result = await db.query
        }
    }
}
*/

export namespace EventService {
    export type Event = {
        id?:number;
        
    }
}