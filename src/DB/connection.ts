import OcracleDB from "oracledb";
import dotenv from "dotenv";
import OracleDB from "oracledb";
dotenv.config();

export namespace DataBaseHandler{

    export async function GetConnection(){
        let connection: OcracleDB.Connection;
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT

        connection = await OcracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        return connection;
    }
}