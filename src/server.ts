import express from "express";
import { Request, Response, Router } from "express";
import { AccountsManager } from "./accounts/accounts";
import { BetsManager } from "./bets/bets";
import { EventsManager } from "./events/events";
import { FinancialManager } from "./financial/financial";
import cookieParser from 'cookie-parser';
import cors from "cors";

const port = 3000; 
const server = express();
const routes = Router();

// Utilizando Cookies para salvar o Token, a role e autenticar o usuário 
server.use(cookieParser());

// Configurando CORS
server.use(cors()); // Permite requisições de qualquer origem

// Middleware global para autenticação e adição de informações ao 'req'
declare global {
    namespace Express {
        interface Request {
            userEmail?: string; // E-mail do usuário autenticado
            userRole?: string;  // Permissão do usuário
        }
    }
}

// Rota Default
routes.get('/', (req: Request, res: Response) => {
    res.statusCode = 403;
    res.send('Acesso não permitido.');
});

// Accounts
routes.post('/login', AccountsManager.loginHandler);
routes.put('/signUp', AccountsManager.SignUpHandler);

// Bets
routes.post('/betOnEvent', BetsManager.BetOnEventHandler);
routes.post('/finishEvent', BetsManager.FinishEventHandler);
routes.get('/searchEvent', BetsManager.SearchEventHandler);

// Events
routes.put('/addNewEvent', EventsManager.addNewEventHandler);
routes.get('/getEvents', EventsManager.getEventsHandler);
routes.put ('/deleteEvent', EventsManager.updateEventStatusHandler);
routes.post('/evaluateNewEvent', EventsManager.evaluateEventHandler);

// Financial
routes.put('/addFunds', FinancialManager.AddFundsHandler);
routes.put('/withdrawFunds', FinancialManager.withdrawFundsHandler);

server.use(routes);

server.listen ( port, () => {
    console.clear();
    console.log(`Server is running on: ${port}`);
});
