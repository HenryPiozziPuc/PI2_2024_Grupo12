import OracleDB from "oracledb";
import dotenv from "dotenv";
dotenv.config();

export namespace DataBaseHandler {

    export async function GetConnection() {
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        return connection;
    }
}
