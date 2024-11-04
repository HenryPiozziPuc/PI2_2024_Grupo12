import {Request, RequestHandler, Response} from "express";
import OracleDB, { oracleClientVersion } from "oracledb";
import { DataBaseHandler } from "../DB/connection";
import { AuthenticateTokenManager } from "../accounts/authenticateToken";

/* Nampespace que contém tudo sobre "contas de usuários" */
    export namespace FinancialManager{

        /* AddFundsParams type */
        type AddFundsParams = {
            ownerCPF: number | undefined;
            amountAdd: number;
            paymentMethod: string;
            cardNumber: string;
            expiryDate: string;
            cvv: string;
        }

        /* addFunds Funcionando */
        async function addFunds(wallet: AddFundsParams) {

            const connection = await DataBaseHandler.GetConnection();
            try {
                const balanceResult = await connection.execute(
                    'SELECT BALANCE FROM WALLET WHERE CPF = :cpf',
                    [wallet.ownerCPF]
                );
    
                const rows: any[][] = balanceResult.rows as any[][];
                let newBalance = 0;
    
                if (rows.length > 0) {
                    const balance =  Number(rows[0]);
                    newBalance = balance + wallet.amountAdd;
                } else {
                    return 'Carteira não encontrada, tente novamente.'
                }
    
                await connection.execute(
                    'UPDATE WALLET SET BALANCE = :newBalance WHERE CPF = :cpf',
                    [newBalance, wallet.ownerCPF]
                );

                await connection.commit();
            } catch (error) {
                await connection.rollback();
                return (error as Error).message;
            }
            
            await connection.close();
            return 'Fundo adicionado com sucesso';
        }
        
        /* addFundsHandler Funcionando */
        export const AddFundsHandler: RequestHandler = async (req: Request, res: Response) => {

            if (await AuthenticateTokenManager.AuthenticateTokenHandler(req, res)) {
                return; 
            }

            const pOwnerCPF = parseInt(req.get('CPF') || '', 10);
            const pAmountAdd = parseFloat(req.get('amountAdd') || '0');
            const pPaymentMethod = req.get('paymentMethod');
            const pCardNumber = req.get('cardNumber');
            const pExpiryDate = req.get('expiryDate');
            const pCvv = req.get('cvv');

            if (pOwnerCPF && pAmountAdd && pPaymentMethod && pCardNumber && pExpiryDate && pCvv) {
                const addFundsParams: AddFundsParams = {
                    ownerCPF: pOwnerCPF,
                    amountAdd: pAmountAdd,
                    paymentMethod: pPaymentMethod,
                    cardNumber: pCardNumber,
                    expiryDate: pExpiryDate,
                    cvv: pCvv
                }

                const addFundsReturn = await addFunds(addFundsParams);
                
                res.status(200).send(addFundsReturn);

            } else {
                res.status(400).send("Todas as informações devem ser fornecidas.");
            }
        }

        /*
        export const withdrawFundsHandler: RequestHandler = async (req: Request, res: Response) => {

        } */

        
    }
