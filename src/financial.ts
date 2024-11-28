import {Request, RequestHandler, Response} from "express";
import OracleDB, { oracleClientVersion } from "oracledb";
    export namespace FinancialHandler{
        export type Wallet = {
            pOwnercpf : number;
            balance: number;
        }
        const wallets: Wallet[] = [];
        export const addfunds =async (req: Request, res: Response) =>{
            const pOwnercpf = Number(req.get('cpf'));
            const pValue = Number(req.get('value'));
            if (!pOwnercpf || !pValue) {
                return res.status(400).send("CPF e valor são obrigatórios");
            }
            else{
            try {
                await AddingFunds(pOwnercpf, pValue);
                res.send("Fundos adicionados com sucesso!");
            } catch (error) {
                console.error("Erro ao adicionar fundos:", error);
                res.status(500).send("Erro ao adicionar fundos");
            }
        }};

        export const withdrawfunds =async (req: Request, res: Response) =>{
            const pOwnercpf = Number(req.get('cpf'));
            const pValue = Number(req.get('value'));
            if (!pOwnercpf || !pValue) {
                return res.status(400).send("CPF e valor são obrigatórios");
            }else{
            try {
                await gettingFunds(pOwnercpf, pValue);
                res.send("Fundos retirados com sucesso!");
            } catch (error) {
                console.error("Erro ao retirar fundos:", error);
                res.status(500).send("Erro ao adicionar fundos");
            }
        }};
        function findWallet(cpf: number): Wallet | undefined {
            return wallets.find(wallet => wallet.pOwnercpf === cpf);
        }
        async function AddingFunds(pOwnercpf: number,value: number){
            OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
            let connection = await OracleDB.getConnection({
                user: process.env.ORACLE_USER,
                password: process.env.ORACLE_PASSWORD,
                connectString:process.env.ORACLE_CONN_STR
            });
            let wallet = findWallet(pOwnercpf);
            if (!wallet) {
                wallet = { pOwnercpf: pOwnercpf, balance: 0 };
                wallets.push(wallet);

            try {
                const newbalance = wallet.balance += value;
                const result = await connection.execute(
                    `UPDATE WALLET SET BALANCE = balance WHERE CPF =:`,
                    {cpf:pOwnercpf},
                    {balance:newbalance}
                )
        }
        catch(error){
            console.error(error);
        }
        }
    }
        async function gettingFunds(pOwnercpf:number,value:number){
            OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
            let connection = await OracleDB.getConnection({
                user: process.env.ORACLE_USER,
                password: process.env.ORACLE_PASSWORD,
                connectString:process.env.ORACLE_CONN_STR
            });
            let wallet = findWallet(pOwnercpf);
            if (!wallet) {
                return Response.status(404).send("Carteira não encontrada");
            }
            try {
                if (wallet.balance < value ) {
                    Response.send("Valor de retirada maior do que o saldo disponível");
                    return;
                }
    
                if (value <= 100) {
                    value *= 1 - (4 / 100);
                } else if (value > 100 && value <= 1000) {
                    value *= 1 - (3 / 100);
                } else if (value > 1000 && value <= 5000) {
                    value *= 1 - (2 / 100);
                } else if (value > 5000 && value <= 100000) {
                    value *= 1 - (1 / 100);
                }
    
                const newbalance = wallet.balance -= value;
                await connection.execute(
                    `UPDATE WALLET SET BALANCE = :balance WHERE CPF = :cpf`,
                    { cpf: pOwnercpf, balance: newbalance }
                );
                Response.send("Saque realizado com sucesso!");
            } catch (error) {
                console.error(error);
                    }
            }
        }