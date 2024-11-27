import {Request, RequestHandler, Response} from "express";
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
                    const balance =  Number(rows[0][0]);
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
            
            return 'Fundo adicionado com sucesso';
        };
        
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
        };

        // Função auxiliar para calcular a taxa com base no valor do saque
        function calculateWithdrawFee(amount: number): number {
            if (amount <= 100) {
                return amount * 0.04; // 4%
            } else if (amount <= 1000) {
                return amount * 0.03; // 3%
            } else if (amount <= 5000) {
                return amount * 0.02; // 2%
            } else if (amount <= 100000) {
                return amount * 0.01; // 1%
            }
            return 0; // Isento para valores acima de R$ 101.000
        }
        
        /* withdrawFunds Funcionando */
        async function withdrawFunds(wallet: WithdrawFundsParams) {
            const connection = await DataBaseHandler.GetConnection();
            try {
                const balanceResult = await connection.execute(
                    'SELECT BALANCE FROM WALLET WHERE CPF = :cpf',
                    [wallet.ownerCPF]
                );
    
                const rows: any[][] = balanceResult.rows as any[][];
                const withdrawFee = calculateWithdrawFee(wallet.amountWithdraw);//calculando taxa
                let newBalance = 0;
    
                if (rows.length > 0) {

                    // Verificando o valor do amountWithdraw
                    if (wallet.amountWithdraw <= 0) {
                        return 'Valor inválido, digite um valor maior que 0.';
                    }
                    
                    const balance =  Number(rows[0][0]);
                    const totalWithdraw = wallet.amountWithdraw + withdrawFee;//somando taxa com saque
                    
                    // Verificando a WalletBalance e o amountWithdraw
                    if (totalWithdraw > balance) {
                        return `Saldo insuficiente. Taxa de saque: R$ ${withdrawFee.toFixed(2)}. Tente novamente.`;
                    }
                    
                    newBalance = balance - totalWithdraw;

                } else {
                    return 'Carteira não encontrada, tente novamente.'
                }
    
                await connection.execute(
                    'UPDATE WALLET SET BALANCE = :newBalance WHERE CPF = :cpf',
                    [newBalance, wallet.ownerCPF]
                );

                await connection.commit();

                return `Saldo retirado com sucesso! Taxa cobrada: R$ ${withdrawFee.toFixed(2)}. Seu novo saldo é ${newBalance}`;

            } catch (error) {
                await connection.rollback();
                return (error as Error).message;
            } finally {
                await connection.close();
            }
            
            
        };

        /* withdrawFundsHandler Funcionando */
        export const withdrawFundsHandler: RequestHandler = async (req: Request, res: Response) => {

            if (await AuthenticateTokenManager.AuthenticateTokenHandler(req, res)) {
                return;
            }

            let pBank, pAgency, pAccountNumber, pPixKey;

            const pOwnerCPF = parseInt(req.get('CPF') || '', 10);
            const pAmountWithdraw = parseFloat(req.get('AmountWithdraw') || '0');
            const pWithdrawMethod = req.get('paymentMethod');
            
            if (!pWithdrawMethod) {
                res.status(400).send("Withdraw Method is required.");
                return;
            }

            if (pWithdrawMethod === 'accountBank') {
                pBank = req.get('bank');
                pAgency = Number(req.get('agency'));
                pAccountNumber = Number(req.get('accountNumber'));
            } else if (pWithdrawMethod === 'pix') {
                pPixKey = req.get('pixKey');
            } else {
                res.status(400).send("Withdraw Method is invalid.");
                return;
            }

            if (pOwnerCPF && pAmountWithdraw && pWithdrawMethod && pBank && pAgency && pAccountNumber) {
                const withdrawFundsParams: WithdrawFundsParams = {
                    ownerCPF: pOwnerCPF,
                    amountWithdraw: pAmountWithdraw,
                    withdrawMethod: pWithdrawMethod,
                    bank: pBank,
                    agency: pAgency,
                    accountNumber: pAccountNumber,
                    pixKey: undefined
                };
                const result = await withdrawFunds(withdrawFundsParams);
                res.status(200).send(result);
            } else if (pOwnerCPF && pAmountWithdraw && pWithdrawMethod && pPixKey) {
                const withdrawFundsParams: WithdrawFundsParams = {
                    ownerCPF: pOwnerCPF,
                    amountWithdraw: pAmountWithdraw,
                    withdrawMethod: pWithdrawMethod,
                    bank: undefined,
                    agency: undefined,
                    accountNumber: undefined,
                    pixKey: pPixKey
                };
                const result = await withdrawFunds(withdrawFundsParams);
                res.status(200).send(result);
            } else {
                res.status(400).send("All required information must be provided.");
            }
        };
    }
