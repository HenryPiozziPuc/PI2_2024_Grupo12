import {Request, RequestHandler, Response} from "express";
import OracleDB, { oracleClientVersion } from "oracledb";
import { FinancialHandler } from "../financial/financial";

export namespace BetsHandler {
    {
        export type Bet = {
            userID: string;
            amount: number
        }
    }
}
