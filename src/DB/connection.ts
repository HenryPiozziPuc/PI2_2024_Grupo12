import * as OracleDB from "oracledb";
import * as dotenv from "dotenv";
import fs from 'fs'; // import para ler o arquivo dump.sql
dotenv.config();


export namespace DataBaseHandler {
    // Fazer a conexão com o Oracle Cloud
    export async function GetConnection() {
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        return connection;
    }

    /*
    // Testar a conexão com o Oracle Cloud importando o Dump
    export async function runDatabaseTests() {
        const connection = await GetConnection();
        const sqlScript = fs.readFileSync('src/DB/dump.sql', 'utf8');
    
        // Divide e executa cada instrução SQL do arquivo dump.sql
        const sqlStatements = sqlScript.split(';').map(stmt => stmt.trim()).filter(stmt => stmt);
    
        for (const statement of sqlStatements) {
            try {
                await connection.execute(statement);
            } catch (error) {
                console.error(`Erro ao executar: ${statement}`, error);
            }
        }
    
        console.log('Dump executado com sucesso.');
        await connection.close();
    }
    
     export async function testInsertion() {
        const connection = await GetConnection();
        try {
            // Verificando se o CPF já existe na tabela ACCOUNTS
            const accountCheck = await connection.execute(`
                SELECT COUNT(*) AS COUNT FROM ACCOUNTS WHERE CPF = 12345678901
            `);

            // Se o count for maior que 0, significa que o CPF já existe
            if (accountCheck && accountCheck.rows && (accountCheck.rows[0] as any).COUNT > 0) {
                // O CPF já existe, não faça nada
            } else {
                // O CPF não existe, insira uma nova conta
                await connection.execute(`
                    INSERT INTO ACCOUNTS (CPF, COMPLETE_NAME, EMAIL, PASSWORD, PHONE_NUMBER, BIRTHDATE, TOKKEN, ROLE)
                    VALUES (123456728901, 'João da Silva', 'joa2o@example.com', 'senha1223', 119872654321, TO_DATE('1990-01-01', 'YYYY-MM-DD'), 'token1223', 1)
                );
            }


            // Verificando se o ID da WALLET já existe
            const walletCheck = await connection.execute(`
                SELECT COUNT(*) AS COUNT FROM WALLET WHERE ID = 1
            `);

            if ((walletCheck.rows as any[])?.[0]?.COUNT === 0) {
                await connection.execute(`
                    INSERT INTO WALLET (ID, CPF, BALANCE)
                    VALUES (1, 12345678901, 1000)
                `);
            }

            // Verificando se o ID do EVENT já existe
            const eventCheck = await connection.execute(`
                SELECT COUNT(*) AS COUNT FROM EVENTS WHERE ID = 1
            `);

            if ((eventCheck.rows as any[])?.[0]?.COUNT === 0) {
                await connection.execute(`
                    INSERT INTO EVENTS (ID, NAME, CATEGORY, QUOTA, START_DATE, END_DATE, APPROVED, STATUS_EVENT)
                    VALUES (1, 'Campeonato Brasileiro', 'Esporte', 10, TO_DATE('2024-10-01', 'YYYY-MM-DD'), TO_DATE('2024-12-31', 'YYYY-MM-DD'), 1, 1)
                `);
            }

            // Verificando se o ID da BET já existe
            const betCheck = await connection.execute(`
                SELECT COUNT(*) AS COUNT FROM BETS WHERE ID = 1
            `);

            if ((betCheck.rows as any[])?.[0]?.COUNT === 0) {
                await connection.execute(`
                    INSERT INTO BETS (ID, CPF, ID_EVENTS, BET_VALUE, CHOICE)
                    VALUES (1, 12345678901, 1, 100, 1)
                `);
            }

            // Confirmando as inserções
            await connection.commit();

            // Realizando um SELECT para verificar as inserções
            const resultAccounts = await connection.execute(`
                SELECT * FROM ACCOUNTS
            `);

            const resultWallet = await connection.execute(`
                SELECT * FROM WALLET
            `);

            const resultEvents = await connection.execute(`
                SELECT * FROM EVENTS
            `);

            const resultBets = await connection.execute(`
                SELECT * FROM BETS
            `);

            // Logando os resultados
            console.table({
                'Accounts': resultAccounts.rows,
                'Wallet': resultWallet.rows,
                'Events': resultEvents.rows,
                'Bets': resultBets.rows
            });

        } catch (error) {
            console.error('Error during insertion and selection:', error);
        } finally {
            await connection.close();
        }
    } */   

}