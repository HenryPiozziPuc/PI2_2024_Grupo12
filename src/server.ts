import express from "express";
import {Request, Response, Router} from "express";
import { AccountsHandler } from "./accounts/accounts";

// Criando os imports restantes
import { FinancialHandler } from "./financial/financial";

import { EventsHandler } from "./events/events";
import { BetsHandler } from "./bets/bets";

const port = 3000; 
const server = express();
const routes = Router();

// definir as rotas. 
// a rota tem um verbo/método http (GET, POST, PUT, DELETE)
routes.get('/', (req: Request, res: Response)=>{
    res.statusCode = 403;
    res.send('Acesso não permitido.');
});

//accounts
routes.post('/login', AccountsHandler.loginHandler);

routes.put('/signUp', AccountsHandler.registerHandler);

//financial
routes.post('/addFunds', FinancialHandler.AddingFunds);

routes.post('/withdrawFunds', FinancialHandler.);

//events
routes.put('/addNewEvent', EventsHandler.);

routes.get('/getEvents', EventsHandler.);

routes.delete('/deleteEvents', EventsHandler.);

routes.post('evaluateNewEvent', EventsHandler.);

//bets
routes.post('/betOnEvent', BetsHandler.);

routes.post('/finishEvent', BetsHandler.);

routes.get('searchEvent', BetsHandler.);

server.use(routes);

server.listen(port, ()=>{
    console.log(`Server is running on: ${port}`);
})

//sempre q usar o await precisa do async 