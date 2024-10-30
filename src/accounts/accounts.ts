import {Request, RequestHandler, Response} from "express";
import { DataBaseHandler } from "../DB/connection";
import OracleDB, { oracleClientVersion } from "oracledb";

/* Nampespace que contém tudo sobre "contas de usuários" */
export namespace AccountsHandler {
    
    //Tipo UserAccount
    export type UserAccount = {
        CPF: number | undefined,
        completeName: string,
        email: string;
        password:string,
        phoneNumber: number,
        birthdate: Date,
        token: string | undefined,
        role: number
    };

    /* GenerateToken funcionando */
    async function generateToken(): Promise<string> {
        const connection = await DataBaseHandler.GetConnection();

        type OutBinds = { token: string };
        
        const result = await connection.execute<OutBinds>(
            `BEGIN
                :token := dbms_random.string('a', 32);
            END;`, { token: { dir: OracleDB.BIND_OUT, type: OracleDB.STRING, maxSize: 32 } }
        );

        await connection.close();
        
        return result.outBinds?.token ?? ""; // Return do token
    }
    
    /* Login funcionando */
    async function login(email: string, password: string) {
        const connection = await DataBaseHandler.GetConnection();

        try {
            const result = await connection.execute(
                'SELECT PASSWORD FROM ACCOUNTS WHERE EMAIL = :email',
                [email]
            );

            const rows: string[][] = result.rows as string[][];
            
            if (rows && rows.length > 0) {
                // Acesso correto ao valor da senha
                const storedPassword = rows[0][0]; // Acesso ao primeiro elemento da primeira linha
                console.log(`A senha encontrada é: ${storedPassword} e a senha digitada foi: ${password}`);
            
                // Compare as senhas
                if (storedPassword === password) {
                    const token = await generateToken();
                    // Atualizando o token no Oracle Cloud
                    await connection.execute(
                        'UPDATE ACCOUNTS SET TOKEN = :token WHERE EMAIL = :email',
                        [token, email]
                    );
                    // Enviando a alteração para o Oracle Cloud e fechando a conexão
                    await connection.commit();
                    await connection.close();
                } else {
                    console.log('Senha incorreta.');
                }
            } else {
                console.log('Nenhuma conta encontrada com esse email.');
            }
            

        } catch (error) {
            console.error('Erro ao realizar login:', error);
        }
    }

    /* LoginHandler funcionando */
    export const loginHandler: RequestHandler = async (req: Request, res: Response) => {
        const pEmail = req.get('email');
        const pPassword = req.get('password');

        if (pEmail && pPassword) {
            const token = await login(pEmail, pPassword);
            res.statusCode = 200; 
            res.send('Login efetuado com sucesso e token gerado e inserido na tabela de Tokens.');

        } else {
            res.statusCode = 400;
            res.send("Parâmetros inválidos ou faltantes.");
        }

        
    };
    
    /* createWallet Funcionando */
    async function createWallet(account: UserAccount) {
        const connection = await DataBaseHandler.GetConnection();
    
        await connection.execute(
            'INSERT INTO WALLET (ID, CPF, BALANCE) VALUES (SEQ_BALANCE.NEXTVAL, :cpf, :balance)',
            [account.CPF, 0]
        );
    
        await connection.commit();
        await connection.close();
    }

    /* signUp Funcionando */
    async function signUp(account: UserAccount) {
        const connection = await DataBaseHandler.GetConnection();
    
        await connection.execute(
            'INSERT INTO ACCOUNTS (CPF, COMPLETE_NAME, EMAIL, PASSWORD, PHONE_NUMBER, BIRTHDATE, ROLE) VALUES(:cpf,:name,:email,:password,:phoneNumber,:birthdate,:role)',
            [account.CPF, account.completeName, account.email, account.password, account.phoneNumber, account.birthdate, account.role]
        );
    
        await connection.commit();
        await connection.close();
    }
    
    /* RegisterHandler funcionando */
    export const registerHandler: RequestHandler = async (req: Request, res: Response) => {
        const pCPF = parseInt(req.get('CPF') || '', 10);
        const pName = req.get('name');
        const pEmail = req.get('email');
        const pPhoneNumber = parseInt(req.get('phoneNumber') || '', 10);
        const pBirthdate = req.get('birthdate');
        const pPassword = req.get('password');
    
        // Verificação se todos os parâmetros foram fornecidos e são válidos
        if (pCPF && pName && pEmail && pPhoneNumber && pBirthdate && pPassword) {
            const newAccount: UserAccount = {
                CPF: pCPF,
                completeName: pName,
                email: pEmail,
                password: pPassword,
                phoneNumber: pPhoneNumber,
                birthdate: new Date(pBirthdate),
                token: undefined,
                role: 0
            }
    
            await signUp(newAccount);
            await createWallet(newAccount);
            
            res.statusCode = 200; 
            res.send('Nova conta e carteira adicionada.');
    
        } else {
            res.statusCode = 400;
            res.send("Parâmetros inválidos ou faltantes.");
        }
    };

}
