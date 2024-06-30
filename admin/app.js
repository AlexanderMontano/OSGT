// app.js
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const awsServerlessExpress = require('aws-serverless-express');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
// Dummy user data
const users = [
  { id: 1, username: 'user1', password: 'password1' },
  { id: 2, username: 'user2', password: 'password2' }
];

passport.use(new LocalStrategy((username, password, done) => {
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    return done(null, user);
  } else {
    return done(null, false, { message: 'Incorrect username or password.' });
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(require('express-session')({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(awsServerlessExpressMiddleware.eventContext());

app.post('/'+'*'+'/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
  res.json({ message: 'Logged in successfully' });
});

app.get('/'+'*'+'/protected', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ message: 'You have accessed a protected route' });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

const server = awsServerlessExpress.createServer(app);
module.exports.handler = (event, context) => awsServerlessExpress.proxy(server, event, context);
