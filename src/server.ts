import express from "express";
import { Request, Response, Router } from "express";
import { AccountsManager } from "./accounts/accounts";
import { BetsManager } from "./bets/bets";
import { EventsManager } from "./events/events";
import { FinancialManager } from "./financial/financial-final";
import { DataBaseHandler } from './DB/connection'

const port = 3000; 
const server = express();
const routes = Router();

// A rota tem um verbo/método http (GET, POST, PUT, DELETE)
routes.get('/', (req: Request, res: Response) => {
    res.statusCode = 403;
    res.send('Acesso não permitido.');
});

// Accounts
routes.post('/login', AccountsManager.loginHandler);
routes.put('/signUp', AccountsManager.SignUpHandler);

/*
// Bets
routes.post('/betOnEvent', BetsManager.betOnEvent);
routes.post('/finishEvent', BetsManager.finishEvent);
routes.get('searchEvent', BetsManager.searchEvent);


// Events
routes.put('/addNewEvent', EventsManager.addNewEvent);
routes.get('/getEvents', EventsManager.getEvents);
routes.delete('/deleteEvent', EventsManager.deleteEvent);
routes.post('/evaluateNewEvent', EventsManager.evaluateNewEvent);
*/

// Financial
routes.put('/addFunds', FinancialManager.AddFundsHandler);
// routes.put('/withdrawFunds', FinancialManager.withdrawFundsHandler);


server.use(routes);

server.listen(port, () => {
    console.clear();
    console.log(`Server is running on: ${port}`);
})