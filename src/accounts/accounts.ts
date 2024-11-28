import { Request, RequestHandler, Response } from "express";
import { DataBaseHandler } from "../DB/connection";
import OracleDB, { oracleClientVersion } from "oracledb";

/* Nampespace que contém tudo sobre "contas de usuários" */
export namespace AccountsManager {

    //Tipo UserAccount
    export type UserAccount = {
        CPF: number | undefined,
        completeName: string,
        email: string;
        password: string,
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
                'SELECT COMPLETE_NAME, PASSWORD, ROLE FROM ACCOUNTS WHERE EMAIL = :email',
                [email]
            );

            const rows: string[][] = result.rows as string[][];

            if (rows && rows.length > 0) {
                const accountName = rows[0][0]; // Acesso ao nome
                const storedPassword = rows[0][1]; // Acesso a senha
                const role = rows[0][2]; // Acesso a permissão 

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
                    return { success: true, message: `Login efetuado com sucesso. Seja bem-vindo, ${accountName}!`, token, role };
                } else {
                    return { success: false, message: 'Senha incorreta. Tente novamente!' }; // Mensagem de erro se a senha estiver incorreta
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
                // Enviar o token e a role na resposta
                res.status(200).json({
                    success: true,
                    message: result.message,
                    token: result.token,  // Token do usuário
                    role: result.role     // Role do usuário
                });
    
            } else {
                res.status(result.message === 'Senha incorreta.' ? 401 : 404).json({
                    success: false,
                    message: result.message
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: "Parâmetros inválidos ou faltantes. Por favor, forneça um email e uma senha válidos."
            });
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
            console.log( error );
            return { success: false, message: 'Erro ao criar conta. Tente novamente mais tarde.' }
        } finally {
            await connection.close();
        }
    }

    //função para verificar a idade do elemento
    const isOver18 = (birthdate: string): boolean => {
        const birth = new Date(birthdate);
        const today = new Date();
    
        // Calcula a idade em anos
        let age = today.getFullYear() - birth.getFullYear();
    
        // Ajusta a idade se o aniversário ainda não ocorreu no ano atual
        if (
            today.getMonth() < birth.getMonth() ||
            (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
        ) {
            age--;
        }
    
        return age >= 18;
    };

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
            //verificaçao da idade do usuario
            if (!isOver18(pBirthdate)) {
                res.status(400).send("Usuário deve ter pelo menos 18 anos.");
                return;
            }

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

            // Enviar o token e a role na resposta
            console.log(newAccount);

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

    async function logout(token: string) {
        const connection = await DataBaseHandler.GetConnection();
        try {
            await connection.execute(
                'UPDATE ACCOUNTS SET TOKEN = NULL WHERE TOKEN = :token',
                [token]
            );
            await connection.commit();
            return { success: true, message: 'Logout realizado com sucesso.' };
        } catch (error) {
            console.log(error);
            return { success: false, message: 'Erro ao realizar logout.' };
        } finally {
            await connection.close();
        }
    }
    
    /* Logout Handler */
    export const LogoutHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.get('token'); // Recupera o token do cabeçalho
    
        if (token) {
            const result = await logout(token);
    
            if (result.success) {
                res.status(200).json(result); // Retorna um JSON com o resultado
            } else {
                res.status(400).json(result); // Retorna um JSON com o erro
            }
        } else {
            res.status(400).json({ success: false, message: 'Parâmetros inválidos ou faltantes.' });
        }
    };

    export async function GetCpfByToken(token: string) {
        const connection = await DataBaseHandler.GetConnection();
    
        try {
            const result = await connection.execute(
                'SELECT CPF FROM ACCOUNTS WHERE TOKEN = :token',
                [token]
            );
    
            const rows: any[][] = result.rows as any[][];
    
            if (rows && rows.length > 0) {
                const cpf = rows[0][0]; // O CPF do usuário associado ao token
                return { success: true, message: 'Conta encontrada com sucesso', cpf };
            } else {
                return { success: false, message: 'Conta inválida' };
            }
        } catch (error) {
            console.log(error);
            return { success: false, message: 'Erro ao verificar conta' };
        } finally {
            await connection.close();
        }
    }

    /* O Token vai vir do Front End que sera pego pelo Cookie Header */
    export const GetCpfByTokenHandler: RequestHandler = async (req: Request, res: Response) => {
        // Token chega como parâmetro da chamada
        const pToken = req.get('token');
    
        if (pToken) {
            const result = await GetCpfByToken(pToken); // Chamando a função para obter o CPF
    
            if (result.success) {
                res.status(200).json({ cpf: result.cpf });
            } else {
                res.status(400).json({ message: result.message });
            }
        } else {
            res.status(400).json({ message: 'Parâmetros inválidos ou faltantes.' });
        }
    };

}