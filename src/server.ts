import express from "express";
import { Request, Response, Router } from "express";
import { AccountsManager } from "./accounts/accounts";
import { BetsManager } from "./bets/bets";
import { EventsManager } from "./events/events";
import { FinancialManager } from "./financial/financial";
import cors from "cors";

const port = 3000; 
const server = express();
const routes = Router();

// Configurando CORS
server.use(cors()); // Permite requisições de qualquer origem
// Rota Default
routes.get('/', (req: Request, res: Response) => {
    res.statusCode = 403;
    res.send('Acesso não permitido.');
});

// Accounts
routes.post('/login', AccountsManager.loginHandler);
routes.post('/signUp', AccountsManager.SignUpHandler);
routes.put('/logout', AccountsManager.LogoutHandler);
routes.get('/getUserInfoByToken', AccountsManager.GetUserInfoByTokenHandler);

// Bets
routes.post('/betOnEvent', BetsManager.BetOnEventHandler);
routes.post('/finishEvent', BetsManager.FinishEventHandler);
routes.get('/searchEvent', BetsManager.SearchEventHandler);
routes.get('/getBets', BetsManager.GetBetsHandler);

// Events
routes.put('/addNewEvent', EventsManager.addNewEventHandler);
routes.get('/getEvents', EventsManager.getEventsHandler);
routes.put ('/deleteEvent', EventsManager.updateEventStatusHandler);
routes.put('/evaluateNewEvent', EventsManager.evaluateEventHandler);

// Financial
routes.put('/addFunds', FinancialManager.AddFundsHandler);
routes.put('/withdrawFunds', FinancialManager.withdrawFundsHandler);
routes.get('/getWalletBalance', FinancialManager.getWalletBalanceHandler);

server.use(routes);

server.listen ( port, () => {
    console.clear();
    console.log(`Server is running on: ${port}`);
});
