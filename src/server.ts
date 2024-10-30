import express from "express";
import { Request, Response, Router } from "express";
import { AccountsHandler } from "./accounts/accounts";
import { BetsHandler } from "./bets/bets";
import { EventsHandler } from "./events/events";
import { FinancialHandler } from "./financial/financial";
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
routes.post('/login', AccountsHandler.loginHandler);
routes.put('/signUp', AccountsHandler.registerHandler);

/*
// Bets
routes.post('/betOnEvent', BetsHandler.betOnEvent);
routes.post('/finishEvent', BetsHandler.finishEvent);
routes.get('searchEvent', BetsHandler.searchEvent);


// Events
routes.put('/addNewEvent', EventsHandler.addNewEvent);
routes.get('/getEvents', EventsHandler.getEvents);
routes.delete('/deleteEvent', EventsHandler.deleteEvent);
routes.post('/evaluateNewEvent', EventsHandler.evaluateNewEvent);

// Financial
routes.post('/addFunds', FinancialHandler.AddingFunds);
routes.post('/withdrawFunds', FinancialHandler.withdrawFunds);
*/

server.use(routes);

server.listen(port, () => {
    console.log(`Server is running on: ${port}`);
})