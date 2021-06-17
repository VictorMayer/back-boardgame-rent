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
    console.log("chegou uma cartinha");
    const { name } = req.body;
    try{
        const validated = await categoryValidation(name);

        if(validated.flag){
            console.log("validação deu boa")
            await connection.query('INSERT INTO categories (name) VALUES ($1)',[name]);
            res.sendStatus(201);
        } else{
            res.send(validated.status);
        }
    } catch {
        res.sendStatus(401)
    }
})



server.listen(4000, ()=>{
    console.log("Server listening to port 4000.");
})

async function categoryValidation(name){
    let result = {flag:true, status:200};
    console.log("entrei na validação");
    if (name.length === 0){
        console.log("deu ruim a validação, ta vazia");
        result.flag = false;
        result.status = 400;
    } else {
        const query = await connection.query('SELECT * FROM categories');
        query.rows.forEach(category => {
            if(category.name === name){
                console.log("deu ruim a validação, ja existe")
                result.flag = false;
                result.status = 409;
            }
        })
    }
    console.log(result);
    return result;
}