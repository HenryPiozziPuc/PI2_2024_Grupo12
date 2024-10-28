import {Request, RequestHandler, Response} from "express";
import OracleDB, { oracleClientVersion } from "oracledb";

/*
    Nampespace que contém tudo sobre "contas de usuários"
*/
export namespace AccountsHandler {
    
    //Tipo UserAccount
    export type UserAccount = {
        CPF: number | undefined,
        completeName: string,
        email: string;
        phoneNumber: number,
        birthdate: Date,
        password:string,
        tokken: string | undefined
    };

    async function login(email: string, password: string){

        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        // 1 abrir conexao, 2 fazer selecet, 3 fechar conexao, 4 retornar os dados
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString:process.env.ORACLE_CONN_STR
        });

        const accounts = await connection.execute(
            'SELECT * FROM ACCOUNTS WHERE EMAIL = :email AND PASSWORD = :password',
            {email, password}
        );

        await connection.close();

        return accounts.rows;
    }

    async function signUp(account: UserAccount){

        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
        let connection = await OracleDB.getConnection({
            user: "ADMIN",
            password: "minhasenha",
            connectString:"dados de conexao servidor oracle"
        });

        const accounts = await connection.execute(
            'INSERT INTO ACCOUNTS (CPF, COMPLETE_NAME, EMAIL, PASSWORD, PHONE_NUMBER, BIRHTDATE) VALUES(:cpf,:name,:email,:password,:phone, :phone_number, :birthdate)',
            [account.CPF, account.completeName, account.email, account.password, account.phoneNumber, account.birthdate]
        );

        await connection.commit();
        await connection.close();

        console.dir(accounts.rows);
    }

    export const loginHandler: RequestHandler = async (req: Request, res: Response) => {
        const pEmail = req.get('email');
        const pPassword = req.get('password');
        if (pEmail && pPassword) {
            const account = await login(pEmail, pPassword);
            if(account && account.length > 0)
            res.statusCode = 200;
            res.send("Login efetuado com sucesso.");
        } else {
            res.statusCode = 400;
            res.send("Parâmetros inválidos ou faltantes.");
        }

    };

    export const registerHandler: RequestHandler = (req: Request, res: Response) => {
        const pCPF = Number(req.get('CPF'));
        const pName = req.get('name');
        const pEmail = req.get('email');
        const pPhoneNumber = req.get('phoneNumber');
        const pBirthdate = req.get('birthdate');
        const pPassword = req.get('password');

        if (pCPF && pName && pEmail && pPhoneNumber && pBirthdate && pPassword) {
            const newAccount: UserAccount = {
                CPF: pCPF,
                completeName: pName,
                email: pEmail,
                phoneNumber: Number(pPhoneNumber),
                birthdate: new Date(pBirthdate),
                password: pPassword,
                tokken: undefined
            }

            const ID = signUp(newAccount);
            
            res.statusCode = 200; 
            res.send(`Nova conta adicionada. Código: ${ID}`);

        } else {
            res.statusCode = 400;
            res.send("Parâmetros inválidos ou faltantes.");
        }

    };
}
