import  compression from 'compression';
import  cookieParser from 'cookie-parser';
import express, { type Application ,type Request,type Response} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from '@app/routes/routes.js';
import notFound from '@app/middleware/notfound.js';
import globalErrorHandler from '@app/middleware/globalErrorhandler.js';


const app:Application = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', 'public/ejs');
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

//parsers
app.use(express.json());
app.use(cookieParser());
app.use(compression());
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  }),
);


app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.send('server is running');
});

app.use(globalErrorHandler);

//Not Found
app.use(notFound);

export default app;