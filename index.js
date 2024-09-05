const express = require('express');
const http = require('http');
const app = express();
const {Server} = require("socket.io");
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const process = require('process');
const path = require('path');
const errorHandler = require('./middleware/error-handler');
const routeService = require('./routes');
const grpcServer = require('./grpc/grpc-server');
const userController = require("./controllers/userController");
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());
const dotenv = require("dotenv");
dotenv.config();
const server = require('http').createServer(app);
const {initialiseRedis} = require ('./helpers/redis')
app.use(cors({origin: (origin, callback) => callback(null, true), credentials: true}));
app.use(helmet());
app.use(compression());
// global error handler
app.use(errorHandler);
app.set('view engine', 'ejs');
const directory = path.join(__dirname, '/upload/user');
app.use('/user', express.static(directory));
//require('./cron')

app.get('/', async (req, res) => {
   res.send("Hello world!");
});

app.post('/payment-status', async (req, res) => {
   let paymentStatus = await userController.updatePaymentStatus(req.body.transactionId,req.body.checksum);
   console.log(req.body);
   if(paymentStatus.code=='ERROR'){
      return res.status(201).send({
         message: 'Transaction id is required',
         statusCode: 201,
         status: false
      })
   }
   res.redirect('/success?transactionid=' + req.body.transactionId + '&status=' + paymentStatus.code);
});

app.post('/callback-url', async (req, res) => {
   // let paymentStatus = await userController.callBackStatus(req);
   // console.log(paymentStatus);
   // if(paymentStatus.code=='Invalid Request' || paymentStatus.code=='PAYMENT_ERROR'){
   //    return res.status(201).send({
   //       message: paymentStatus.code,
   //       statusCode: 201,
   //       status: false
   //    })
   // }else{
   //    return res.status(200).send({
   //       message: paymentStatus.code,
   //       statusCode: 200,
   //       status: true
   //    })
   // }
});

app.get('/success', (req, res) => {
   res.render('success.ejs', {
      transaction_id: req.query.transactionid,
      payment_status: req.query.status
   });
});

// api routes
routeService(app);
// start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;
server.listen(port, () => console.log('Server listening on port ' + port));
initialiseRedis();