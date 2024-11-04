import {Request, RequestHandler, Response} from "express";
import { DataBaseHandler } from "../DB/connection";
import OracleDB, { oracleClientVersion } from "oracledb";

/* Nampespace que contém tudo sobre "contas de usuários" */
export namespace AccountsManager {
    
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
            // Seleciona a senha e a role do banco de dados
            const result = await connection.execute(
                'SELECT PASSWORD, ROLE FROM ACCOUNTS WHERE EMAIL = :email',
                [email]
            );

            const rows: string[][] = result.rows as string[][];

            if (rows && rows.length > 0) {
                const storedPassword = rows[0][0]; // Acesso a senha
                const role = rows[0][1]; // Acesso a permissão 

                // Verifica se a senha armazenada corresponde à senha digitada
                if (storedPassword === password) {
                    const token = await generateToken();

                    // Atualiza o token no banco de dados
                    await connection.execute(
                        'UPDATE ACCOUNTS SET TOKEN = :token WHERE EMAIL = :email',
                        [token, email]
                    );

                    // Envia a alteração para o banco de dados
                    await connection.commit();
                    return { success: true, message: 'Login efetuado com sucesso. Token gerado e inserido na coluna TOKEN da tabela ACCOUNTS e nos Cookies da aplicação.s', token, role };
                } else {
                    return { success: false, message: 'Senha incorreta.' }; // Mensagem de erro se a senha estiver incorreta
                }
            } else {
                return { success: false, message: 'Nenhuma conta encontrada com esse email.' }; // Mensagem se não houver conta
            }
        } catch (error) {
            return { success: false, message: 'Erro ao realizar login. Tente novamente mais tarde.' }; // Mensagem de erro genérica
        } finally {
            await connection.close();
        }
    }


   /* LoginHandler funcionando */
    export const loginHandler: RequestHandler = async (req: Request, res: Response) => {
        const pEmail = req.get('email');
        const pPassword = req.get('password');

        if (pEmail && pPassword) {
            const result = await login(pEmail, pPassword);
            
            if (result.success) {
                // Armazena o token e a role no cookie
                res.cookie('authToken', result.token, {
                    httpOnly: true, // O cookie não pode ser acessado pelo JavaScript no lado do cliente
                    secure: false, // Somente HTTPS (ou true se você estiver em produção)
                    maxAge: 10000  // 10 Segundos | 1 hora = 3600000  
                });

                res.cookie('userRole', result.role, {
                    httpOnly: true, // O cookie não pode ser acessado pelo JavaScript no lado do cliente
                    secure: false, // Somente HTTPS (ou true se você estiver em produção)
                    maxAge: 10000  // 10 Segundos | 1 hora = 3600000 
                });

                res.status(200).send(result.message);

            } else {
                res.status(result.message === 'Senha incorreta.' ? 401 : 404).send(result.message); 
            }
        } else {
            res.status(400).send("Parâmetros inválidos ou faltantes. Por favor, forneça um email e uma senha válidos.");
        }
    };


    
    /* createWallet Funcionando */
    async function createWallet(account: UserAccount) {
        const connection = await DataBaseHandler.GetConnection();
        try {
            await connection.execute(
                'INSERT INTO WALLET (ID, CPF, BALANCE) VALUES (SEQ_BALANCE.NEXTVAL, :cpf, :balance)',
                [account.CPF, 0]
            );
            await connection.commit();
            return { success: true, message: 'Conta e carteira criada com sucesso.' };
        } catch (error) {
            return { success: false, message: 'Erro ao criar carteira do usuário. Tente novamente mais tarde.' }
        } finally {
            await connection.close();
        }
    }

    /* signUp Funcionando */
    async function signUp(account: UserAccount) {
        const connection = await DataBaseHandler.GetConnection();
        
        try {
            await connection.execute(
                'INSERT INTO ACCOUNTS (CPF, COMPLETE_NAME, EMAIL, PASSWORD, PHONE_NUMBER, BIRTHDATE, ROLE) VALUES(:cpf,:name,:email,:password,:phoneNumber,:birthdate,:role)',
                [account.CPF, account.completeName, account.email, account.password, account.phoneNumber, account.birthdate, account.role]
            );
            await connection.commit();
            return { success: true, message: 'Conta e carteira criados com sucesso.' };
        } catch (error) {
            return { success: false, message: 'Erro ao criar conta. Tente novamente mais tarde.' }
        } finally {
            await connection.close();
        }
    }
    
    /* SignUpHandler funcionando */
    export const SignUpHandler: RequestHandler = async (req: Request, res: Response) => {
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
                role: 0 // 0 = user, 1 = admin
            }
            const result = await signUp(newAccount);

            if (result.success) {
                // Cria carteira no Oracle Cloud
                const walletResult = await createWallet(newAccount);
                if (walletResult.success) {
                    res.status(200).send(walletResult.message);    
                } else {
                    res.status(400).send(walletResult.message);
                }
            } else {
                res.status(400).send(result.message);
            }

        } else {
            res.status(400).send("Parâmetros inválidos ou faltantes.");
        }
    };

}