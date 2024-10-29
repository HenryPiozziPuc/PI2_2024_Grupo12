import {Request, RequestHandler, Response} from "express";
import { DataBaseHandler } from "../DB/connection";
import OracleDB, { oracleClientVersion } from "oracledb";

/*
    Nampespace que contém tudo sobre "contas de usuários"
*/
export namespace AccountsHandler {
    
    //Tipo UserAccount
    export type UserAccount = {
        CPF: number, // | Undefined
        completeName: string,
        email: string;
        password:string,
        phoneNumber: number,
        birthdate: Date,
        token: string | undefined,
        role: number
    };

    async function login(email: string, password: string) {

        const connection = await DataBaseHandler.GetConnection();

        const accounts = await connection.execute(
            'SELECT * FROM ACCOUNTS WHERE EMAIL = :email AND PASSWORD = :password',
            {email, password}
        );

        await connection.close();

        return accounts.rows;
    }

    async function signUp(account: UserAccount){

        const connection = await DataBaseHandler.GetConnection();

        const accounts = await connection.execute(
            'INSERT INTO ACCOUNTS (CPF, COMPLETE_NAME, EMAIL, PASSWORD, PHONE_NUMBER, BIRHTDATE, TOKEN, ROLE) VALUES(:cpf,:name,:email,:password,:phone, :phone_number, :birthdate,:token,:role)',
            [account.CPF, account.completeName, account.email, account.password, account.phoneNumber, account.birthdate, account.token, account.role]
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
                password: pPassword,
                phoneNumber: Number(pPhoneNumber),
                birthdate: new Date(pBirthdate),
                token: undefined,
                role: 0
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
