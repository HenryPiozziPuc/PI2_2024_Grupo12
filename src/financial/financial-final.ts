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
        
        type WithdrawFundsParams = {
            ownerCPF: number | undefined;
            amountWithdraw: number;
            withdrawMethod:string;
            bank: string | undefined;
            agency: number | undefined;
            accountNumber: number | undefined;
            pixKey: string | undefined;
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
            } finally {
                await connection.close();
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

                res.status(200).send(await addFunds(addFundsParams));

            } else {
                res.status(400).send("Todas as informações devem ser fornecidas.");
            }
        }
        
        
        async function withdrawFunds(wallet: WithdrawFundsParams) {
            
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
                    newBalance = balance - wallet.amountwithdraw;
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
            } finally {
                await connection.close();
            }
            
            await connection.close();
            return 'Fundo adicionado com sucesso';
        }
        
        export const withdrawFundsHandler: RequestHandler = async (req: Request, res: Response) => {

            if (await AuthenticateTokenManager.AuthenticateTokenHandler(req, res)) {
                return; 
            }

            let pBank, pAgency, pAccountNumber, pPixKey;

            const pOwnerCPF = parseInt(req.get('CPF') || '', 10);
            const pAmountwithdraw = parseFloat(req.get('amountwithdraw') || '0');
            const pWithdrawtMethod = req.get('paymentMethod');
            
            if (pWithdrawtMethod === 'accountBank') {
                pBank = req.get('bank');
                pAgency = Number(req.get('agency'));
                pAccountNumber = Number(req.get('accountNumber'));
            } else if (pWithdrawtMethod === 'pix') {
                pPixKey = req.get('pixKey');
            } else {
                res.status(400).send("Withdraw Method invalid.");
            }
           

            if (pOwnerCPF && pAmountwithdraw && pWithdrawtMethod && pBank && pAgency && pAccountNumber) {
                const withdrawFundsParams: WithdrawFundsParams = {
                    ownerCPF: pOwnerCPF,
                    amountWithdraw: pAmountwithdraw,
                    withdrawMethod: pWithdrawtMethod,
                    bank: pBank,
                    agency: pAgency,
                    accountNumber: pAccountNumber,
                    pixKey: undefined // Se a escolha for AccountBank, o pixKey deve ser undefined
                }

                res.status(200).send(await withdrawFunds(withdrawFundsParams)); 

            } else if (pOwnerCPF && pAmountwithdraw && pWithdrawtMethod && pPixKey) {
                const withdrawFundsParams: WithdrawFundsParams = {
                    ownerCPF: pOwnerCPF,
                    amountWithdraw: pAmountwithdraw,
                    withdrawMethod: pWithdrawtMethod,
                    bank: undefined, // Se a escolha for pixKey, Bank, Agency e accountNumber devem ser undefined
                    agency: undefined, // Se a escolha for pixKey, Bank, Agency e accountNumber devem ser undefined
                    accountNumber: undefined, // Se a escolha for pixKey, Bank, Agency e accountNumber devem ser undefined
                    pixKey: pPixKey
                }
                
                res.status(200).send(await withdrawFunds(withdrawFundsParams));
                
            } else {
                res.status(400).send("Todas as informações devem ser fornecidas.");
            }
        }

        
    }
