import {Request, RequestHandler, Response} from "express";
import OracleDB, { oracleClientVersion } from "oracledb";

export namespace FinancialHandler{
    export type Wallet = {
        OwnerEmail: string;
        balance: number;
    }
    
    export const AddingFunds : RequestHandler = (req: Request, res: Response) => {
        const pOwnerEmail = req.get('email');
        
        if (pOwnerEmail){
            const oldbalance = getWalletBalance(pOwnerEmail);
            const pBalance = req.get('added value');
            const pNewValue = balance + pBalance;
            res.send(`Valor Atualizado ${pNewValue}`);  
        }
    }

    export const RetrievingFunds :  RequestHandler = (req: Request, res: Response) =>{
        const pOwnerEmail = req.get('email');
        if(pOwnerEmail){
            const oldbalance = getWalletBalanceHandler;
            const pValue = req.get('retrieved value');
            const pNewValue = oldbalance - pValue;
            if (pValue > oldbalance){
                res.statusCode = 400;
                res.send("Retire um valor menor do que o saldo!")
            }
            else{
                res.statusCode = 200;
                res.send(`Novo saldo ${pNewValue}`);
            }
         
        }
    }

    // getWalletBalance Função

    function getWalletBalance (email: string) : number | undefined {
        return walletsDatabase.find ( w => {
            if (w.ownerEmail === email) {
                return true; // .find precisa determinar se a condição foi atendida com True or False!
            }
        })?.balance;
    }

    export const getWalletBalanceHandler:RequestHandler = (req: Request, res: Response) => {
        const pEmail = req.get('email');
        if (!pEmail) {
            res.statusCode = 400;
            res.send("Parâmetros inválidos ou faltantes.");
            return;
        } else {
            const balance = getWalletBalance(pEmail);
            if (balance !== undefined) {
                res.statusCode = 200;
                res.send(`O saldo da carteira foi encontrado: ${balance}`)
            } else {
                res.statusCode = 400;
                res.send(`Carteira não encontrada para o email ${pEmail}`);
            }
        }
    }


}