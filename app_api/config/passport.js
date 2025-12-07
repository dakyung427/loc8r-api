const mongoose = require('mongoose');
require('../models/users'); // User 모델 등록
const User = mongoose.model('User');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    (username, password, done) => {
      User.findOne({ email: username }, (err, user) => {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Incorrect username.' });
        if (!user.validPassword(password)) return done(null, false, { message: 'Incorrect password.' });
        return done(null, user);
      });
    }
  )
);
