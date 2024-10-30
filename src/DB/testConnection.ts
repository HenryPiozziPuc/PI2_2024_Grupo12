import { DataBaseHandler } from "./connection";

async function main() {
    await DataBaseHandler.testConnection();
}

main();
