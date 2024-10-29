import express from "express";
import { Request, Response, Router } from "express";
import { AccountsHandler } from "./accounts/accounts";
import { BetsHandler } from "./bets/bets";
import { EventsHandler } from "./events/events";
import { FinancialHandler } from "./financial/financial";

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

// Bets
routes.post('/betOnEvent', BetsHandler.);
routes.post('/finishEvent', BetsHandler.);
routes.get('searchEvent', BetsHandler.);

// Events
routes.put('/addNewEvent', EventsHandler.addNewEvent);
routes.get('/getEvents', EventsHandler.getEvents);
routes.delete('/deleteEvent', EventsHandler.deleteEvent);
routes.post('/evaluateNewEvent', EventsHandler.evaluateNewEvent);


// Financial
routes.post('/addFunds', FinancialHandler.AddingFunds);
routes.post('/withdrawFunds', FinancialHandler.);

server.use(routes);

server.listen(port, () => {
    console.log(`Server is running on: ${port}`);
})