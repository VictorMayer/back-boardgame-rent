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
});

server.get('/games', async (req, res) => {
    const { name } = req.query;
    try{
        if(name){
            const queryInput = `WHERE games.name ILIKE $1`
            const query = await connection.query(`
                SELECT games.*, categories.name AS "categoryName"
                FROM games JOIN categories
                ON games."categoryId" = categories.id 
                ${queryInput}
            `,[name+'%']);
            res.send(query.rows[0]);
        } else {
            const query = await connection.query(`
                SELECT games.*, categories.name AS "categoryName"
                FROM games JOIN categories
                ON games."categoryId" = categories.id
            `);
            res.send(query.rows);
        }
    } catch(e) {
        console.log(e);
        res.sendStatus(400);
    }
});

server.post('/games', async (req, res) => {
    const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
    try{
        const validated = await gameValidation(name, stockTotal, pricePerDay, categoryId);
        console.log(validated);
        if(validated.flag){
            await connection.query('INSERT INTO games (name, image, stockTotal, categoryId, pricePerDay) VALUES ($1, $2, $3, $4, $5)',[name, image, stockTotal, categoryId, pricePerDay]);
            res.sendStatus(201);
        }else{
            res.sendStatus(validated.status);
        }
    } catch(e){
        console.log(e);
        res.sendStatus(400);
    }
});

server.get('/customers', async (req, res) => {
    const { cpf } = req.query;
    try{
        if(cpf){
            const query = await connection.query(`SELECT * FROM customers WHERE cpf ILIKE $1`,[cpf+'%']);
            res.send(query.rows);
        } else {
            const query = await connection.query(`SELECT * FROM customers`);
            res.send(query.rows)
        }
    } catch(e){
        console.log(e);
        res.sendStatus(400);
    }
});

server.get('/customers/:id', async (req, res) => {
    const { id } = req.params;
    try{
        if (!isNaN(id)){
            const query = await connection.query(`SELECT * FROM customers WHERE id = $1`,[id]);
            res.send(query.rows[0]);
        } else {
            res.sendStatus(400);
        }
    } catch(e){
        console.log(e);
        res.sendStatus(400);
    }
});

server.post('/customers', async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;
    try{
        const validated = await customerValidation("post", name, phone, cpf, birthday);
        console.log(validated);
        if(validated.flag){
            await connection.query(`INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)`, [name, phone, cpf, birthday]);
            res.sendStatus(201);
        } else {
            res.sendStatus(validated.status);
        }
    } catch(e) {
        console.log("caiu no catch!");
        console.log(e);
        res.sendStatus(400);
    }
});

server.put('/customers/:id', async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;
    const { id } = req.params;
    try{
        if(isNaN(id)){
            res.sendStatus(400);
            return;
        }
        const validated = await customerValidation("put", name, phone, cpf, birthday);
        console.log(validated);
        if(validated.flag){
            await connection.query(`
                UPDATE customers
                SET name = $1, phone = $2, cpf = $3, birthday = $4
                WHERE id = $5`, [name, phone, cpf, birthday, id]);
            res.sendStatus(200);
        } else {
            res.sendStatus(validated.status);
        }
    } catch(e) {
        console.log("caiu no catch!");
        console.log(e);
        res.sendStatus(400);
    }
});

async function customerValidation(type ,name, phone, cpf, birthday){
    let result = {flag: true, status:201}
    if(isNaN(parseInt(phone)) || isNaN(parseInt(cpf))){
        console.log("phone or cpf isNaN");
        result.flag=false;
        result.status=400;
        return result;
    }
    if(name.length === 0 || cpf.length !== 11 || phone.length < 10 || phone.length > 11){
        console.log("lengths invalid");
        result.flag=false;
        result.status=400;
        return result;
    }
    const regex = /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/;
    if(!regex.test(birthday)){
        console.log("data inválida");
        result.flag=false;
        result.status=400;
        return result;
    }
    const customers = await connection.query(`SELECT * FROM customers`);
    if(type === "post" && customers.rows.length > 0){
        customers.rows.forEach(customer => {
            console.log(customer);
            if(customer.cpf === cpf){
                result.flag=false;
                result.status=409;
            }
        });
    }
    return result;
}

async function gameValidation(name, stockTotal, pricePerDay, categoryId){
    let result = {flag: true, status:200};
    let canReturn=false;
    if (name.length === 0){
        result.flag = false;
        result.status = 400;
        return result;
    }
    if (stockTotal <= 0 || pricePerDay <= 0){
        result.flag = false;
        result.status = 400;
        return result;
    }
    const games = await connection.query('SELECT * FROM games');
    if(games.rows.length > 0){
        games.rows.forEach(game => {
            if(game.name === name){
                result.flag = false;
                result.status = 409;
                canReturn = true;
            }
        })
    }
    if(canReturn)return result;
    result.flag = false;
    result.status = 400;
    const categories = await connection.query('SELECT * FROM categories');
    categories.rows.forEach(category => {
        if(category.id === categoryId){
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
        if(query.rows.length > 0){
            query.rows.forEach(category => {
                if(category.name === name){
                    result.flag = false;
                    result.status = 409;
                }
            })
        }
    }
    return result;
}

server.listen(4000, ()=>{
    console.log("Server listening to port 4000.");
});