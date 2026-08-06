import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, {
  type Application,
  type Request,
  type Response,
} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from '@app/routes/routes.js';
import notFound from '@app/middleware/notfound.js';
import globalErrorHandler from '@app/middleware/globalErrorhandler.js';
import generateCryptoString from '@app/utils/generateCryptoString.js';

const app: Application = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', 'public/ejs');
app.use(
  express.json({
    limit: '500mb',
    verify: (req, _res, buffer) => {
      (req as Request).rawBody = buffer;
    },
  }),
);
app.use(express.urlencoded({ limit: '500mb', extended: true }));

//parsers
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

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
          'https://unpkg.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  }),
);

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://js.stripe.com; frame-src https://js.stripe.com; connect-src 'self' https://api.stripe.com; img-src 'self' data:; style-src 'self' 'unsafe-inline';",
  );
  next();
});

app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.send('server is running');
});

app.use(globalErrorHandler);

//Not Found
app.use(notFound);

export default app;
