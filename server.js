import express from 'express'
import cors from 'cors'
import pg from 'pg'

const server = express();
server.use(express.json());
server.use(cors());

const { Pool } = pg;

const connectionData = {
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
}

const connection = new Pool(connectionData);

server.get('/categories', async (req, res) => {
    try{
        const query = await connection.query('SELECT * FROM categories');
        res.send(query.rows);
    } catch {
        res.sendStatus(400);
    }
})

server.post('/categories', async (req, res) => {
    const { name } = req.body;
    try{
        const validated = await categoryValidation(name);

        if(validated.flag){
            await connection.query('INSERT INTO categories (name) VALUES ($1)',[name]);
            res.sendStatus(201);
        } else{
            res.sendStatus(validated.status);
        }
    } catch {
        res.sendStatus(401)
    }
})

server.get('/games', async (req, res) => {
    const { name } = req.query;
    console.log(name);
    try{
        const queryInput = `WHERE games.name ILIKE $1`
        const query = await connection.query(`
            SELECT games.*, categories.name AS "categoryName"
            FROM games JOIN categories
            ON games."categoryId" = categories.id 
            ${queryInput}
        `,[name+'%']);
        res.send(name ? query.rows[0] : query.rows);
    } catch(e) {
        console.log(e);
        res.sendStatus(400);
    }
})

server.post('/games', async (req, res) => {
    const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
    try{
        const validated = await gameValidation(name, stockTotal, pricePerDay, categoryId);
        console.log(validated);
        if(validated.flag){
            res.sendStatus(201);
        }else{
            res.sendStatus(validated.status)
        }
    } catch(e){
        console.log("entrei no catch, o erro é o seguinte:")
        console.log(e);
        res.send(400);
    }
})

server.listen(4000, ()=>{
    console.log("Server listening to port 4000.");
})

async function gameValidation(name, stock, price, categoryId){
    console.log("entrou na validação");
    let result = {flag: true, status:200};
    let canReturn=false;
    if (name.length === 0){
        console.log("nome do jogo vazio");
        result.flag = false;
        result.status = 400;
        return result;
    }
    if (stock <= 0 || price <= 0){
        console.log("preço ou estoque menor ou igual a 0");
        result.flag = false;
        result.status = 400;
        return result;
    }
    const query = await connection.query('SELECT * FROM games');
        query.rows.forEach(game => {
            if(game.name === name){
                console.log("nome de jogo repetido");
                result.flag = false;
                result.status = 409;
                canReturn = true;
            }
        })
    if(canReturn)return result;
    result.flag = false;
    result.status = 400;
    query = await connection.query('SELECT * FROM categories');
    query.rows.forEach(category => {
        if(category.id === categoryId){
            console.log("categoria existente");
            result.flag = true;
            result.status = 200;
        }
    });
    return result;
}

async function categoryValidation(name){
    let result = {flag:true, status:201};
    if (name.length === 0){
        result.flag = false;
        result.status = 400;
    } else {
        const query = await connection.query('SELECT * FROM categories');
        query.rows.forEach(category => {
            if(category.name === name){
                result.flag = false;
                result.status = 409;
            }
        })
    }
    return result;
}

