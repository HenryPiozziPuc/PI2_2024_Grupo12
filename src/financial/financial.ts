import {Request, RequestHandler, Response} from "express";
import OracleDB, { oracleClientVersion } from "oracledb";
export namespace FinancialHandler{
    export type Wallet = {
        OwnerEmail: string;
        balance: number;
    }
    export const AddingFunds : RequestHandler = (req: Request, res: Response) => {
        const pOwnerEmail = req.get('email');
        if(pOwnerEmail){
            const pBalance = req.get('balance');
    }
}
}