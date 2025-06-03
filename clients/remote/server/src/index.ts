import express, {Request, Response} from 'express';

const app = express();
const port = 3000;

app.use(express.json());

app.get('/api/hello', (req: Request, res: Response) => {
    res.json({message: 'Hello, world!'});
});

app.post('/api/data', (req: Request, res: Response) => {
    const data = req.body;
    console.log('Received data:', data);
    res.json({message: 'Data received', data});
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});